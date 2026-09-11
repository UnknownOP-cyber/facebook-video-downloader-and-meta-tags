from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import re
import os
import tempfile
from urllib.parse import urlparse


app = Flask(__name__)
CORS(app)


def is_valid_facebook_url(url):
    try:
        parsed = urlparse(url)

        valid_domains = [
            "facebook.com",
            "www.facebook.com",
            "m.facebook.com",
            "fb.watch",
            "www.fb.watch"
        ]

        return (
            parsed.scheme in ["http", "https"]
            and parsed.netloc.lower() in valid_domains
        )

    except Exception:
        return False


def extract_hashtags(text):
    if not text:
        return []

    hashtags = re.findall(r'#\w+', text)

    unique_tags = []

    for tag in hashtags:
        if tag not in unique_tags:
            unique_tags.append(tag)

    return unique_tags


def clean_filename(filename):
    """
    Make filename safe for Windows/Linux/macOS.
    """

    filename = re.sub(
        r'[<>:"/\\|?*\x00-\x1F]',
        '',
        filename
    )

    filename = filename.strip()

    if not filename:
        filename = "facebook_video"

    return filename[:100]


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():
    return render_template("index.html")


# ============================================================
# FETCH METADATA
# ============================================================

@app.route("/fetch", methods=["POST"])
def fetch_video_info():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid request."
            }), 400

        url = data.get("url", "").strip()

        if not url:
            return jsonify({
                "success": False,
                "error": "Please enter a Facebook video or Reel URL."
            }), 400

        if not is_valid_facebook_url(url):
            return jsonify({
                "success": False,
                "error": "Invalid Facebook URL."
            }), 400


        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 20
        }


        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        description = info.get("description") or ""

        title = (
            info.get("title")
            or info.get("fulltitle")
            or "Facebook Video"
        )

        uploader = (
            info.get("uploader")
            or info.get("channel")
            or info.get("creator")
            or "Unknown"
        )

        upload_date = info.get("upload_date") or ""

        thumbnail = info.get("thumbnail") or ""

        hashtags = extract_hashtags(description)


        return jsonify({

            "success": True,

            "title": title,

            "caption": description,

            "description": description,

            "tags": hashtags,

            "author": uploader,

            "upload_date": upload_date,

            "thumbnail": thumbnail,

            "original_url": url

        })


    except yt_dlp.utils.DownloadError:

        return jsonify({
            "success": False,
            "error": (
                "Unable to fetch this video. "
                "It may be private, deleted, "
                "login-restricted, unavailable, "
                "or unsupported."
            )
        }), 400


    except Exception as e:

        print("Metadata Error:", e)

        return jsonify({
            "success": False,
            "error": "Something went wrong while fetching information."
        }), 500


# ============================================================
# GET AVAILABLE VIDEO QUALITIES
# ============================================================

@app.route("/formats", methods=["POST"])
def get_video_formats():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid request."
            }), 400


        url = data.get("url", "").strip()


        if not url or not is_valid_facebook_url(url):

            return jsonify({
                "success": False,
                "error": "Invalid Facebook URL."
            }), 400


        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 20
        }


        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        formats = []

        seen_heights = set()


        for fmt in info.get("formats", []):

            height = fmt.get("height")

            format_id = fmt.get("format_id")

            if not height or not format_id:
                continue


            # Only show actual video formats
            if fmt.get("vcodec") == "none":
                continue


            # Keep useful resolutions
            if height < 144:
                continue


            # Avoid duplicate resolutions
            if height in seen_heights:
                continue


            seen_heights.add(height)


            ext = fmt.get("ext") or "mp4"

            filesize = fmt.get("filesize") or fmt.get("filesize_approx")

            if filesize:

                size_mb = round(
                    filesize / (1024 * 1024),
                    1
                )

                size_text = f"{size_mb} MB"

            else:

                size_text = "Size unknown"


            formats.append({

                "format_id": format_id,

                "height": height,

                "width": fmt.get("width"),

                "ext": ext,

                "fps": fmt.get("fps"),

                "filesize": size_text,

                "has_audio": fmt.get("acodec") != "none"

            })


        # Highest resolution first
        formats.sort(
            key=lambda x: x["height"],
            reverse=True
        )


        if not formats:

            return jsonify({
                "success": False,
                "error": "No downloadable video qualities were found."
            }), 400


        return jsonify({

            "success": True,

            "formats": formats

        })


    except yt_dlp.utils.DownloadError:

        return jsonify({
            "success": False,
            "error": (
                "Unable to read available video qualities. "
                "The video may be private or unavailable."
            )
        }), 400


    except Exception as e:

        print("Format Error:", e)

        return jsonify({
            "success": False,
            "error": "Unable to load video qualities."
        }), 500


# ============================================================
# DOWNLOAD VIDEO
# ============================================================

@app.route("/download", methods=["POST"])
def download_video():

    temp_dir = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid request."
            }), 400

        url = data.get("url", "").strip()
        height = data.get("height")

        if not url or not is_valid_facebook_url(url):
            return jsonify({
                "success": False,
                "error": "Invalid Facebook URL."
            }), 400

        if not height:
            return jsonify({
                "success": False,
                "error": "No video quality was selected."
            }), 400

        height = int(height)

        temp_dir = tempfile.mkdtemp()

        output_template = os.path.join(
            temp_dir,
            "%(title)s.%(ext)s"
        )

        # Select the requested resolution dynamically.
        # Prefer MP4-compatible video + M4A audio.
        format_selector = (
            f"bestvideo[height<={height}][ext=mp4]+"
            f"bestaudio[ext=m4a]/"
            f"bestvideo[height<={height}]+"
            f"bestaudio/"
            f"best[height<={height}]"
        )

        ydl_opts = {
            "quiet": False,
            "no_warnings": False,
            "noplaylist": True,
            "socket_timeout": 60,

            "outtmpl": output_template,

            "format": format_selector,

            # Merge video and audio into MP4
            "merge_output_format": "mp4",

            "continuedl": True,

            "retries": 3,

            "fragment_retries": 3,

            "http_headers": {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "(KHTML, like Gecko) "
                    "Chrome/153.0.0.0 Safari/537.36"
                )
            }
        }

        print(f"Downloading requested quality: {height}p")
        print(f"Format selector: {format_selector}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = ydl.extract_info(
                url,
                download=True
            )

            prepared_path = ydl.prepare_filename(info)

        # yt-dlp may change the final extension after merging.
        base_path = os.path.splitext(prepared_path)[0]

        possible_extensions = [
            ".mp4",
            ".mkv",
            ".webm",
            ".mov"
        ]

        downloaded_path = None

        for extension in possible_extensions:

            candidate = base_path + extension

            if os.path.exists(candidate):
                downloaded_path = candidate
                break

        # Fallback: find whatever yt-dlp actually created.
        if not downloaded_path:

            downloaded_files = [
                os.path.join(temp_dir, file)
                for file in os.listdir(temp_dir)
                if os.path.isfile(
                    os.path.join(temp_dir, file)
                )
            ]

            if downloaded_files:
                downloaded_path = downloaded_files[0]

        if not downloaded_path or not os.path.exists(downloaded_path):

            raise Exception(
                "Downloaded video file could not be found."
            )

        title = (
            info.get("title")
            or "facebook_video"
        )

        safe_title = clean_filename(title)

        actual_extension = os.path.splitext(
            downloaded_path
        )[1].lower()

        # Final filename.
        if actual_extension == ".mp4":
            final_filename = safe_title + ".mp4"
            mimetype = "video/mp4"

        elif actual_extension == ".webm":
            final_filename = safe_title + ".webm"
            mimetype = "video/webm"

        elif actual_extension == ".mkv":
            final_filename = safe_title + ".mkv"
            mimetype = "video/x-matroska"

        else:
            final_filename = safe_title + actual_extension
            mimetype = "application/octet-stream"

        print(f"Final file: {downloaded_path}")
        print(f"Sending as: {final_filename}")

        return send_file(
            downloaded_path,
            as_attachment=True,
            download_name=final_filename,
            mimetype=mimetype
        )

    except yt_dlp.utils.DownloadError as e:

        print("\n========== YT-DLP DOWNLOAD ERROR ==========")
        print(e)
        print("===========================================\n")

        return jsonify({
            "success": False,
            "error": (
                "yt-dlp could not download this "
                "quality. Try another quality."
            )
        }), 400

    except Exception as e:

        print("\n========== DOWNLOAD ERROR ==========")
        print(e)
        print("====================================\n")

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    temp_dir = None

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Invalid request."
            }), 400


        url = data.get("url", "").strip()

        format_id = str(
            data.get("format_id", "")
        ).strip()


        if not url or not is_valid_facebook_url(url):

            return jsonify({
                "success": False,
                "error": "Invalid Facebook URL."
            }), 400


        if not format_id:

            return jsonify({
                "success": False,
                "error": "No video quality was selected."
            }), 400


        # Temporary directory for downloaded video
        temp_dir = tempfile.mkdtemp()


        output_template = os.path.join(
            temp_dir,
            "%(title)s.%(ext)s"
        )


        ydl_opts = {

            "quiet": True,

            "no_warnings": True,

            "noplaylist": True,

            "socket_timeout": 60,

            "outtmpl": output_template,

            # Selected video + best available audio
            "format": (
                f"{format_id}+bestaudio/"
                f"{format_id}"
            ),

            # Merge into MP4 when possible
            "merge_output_format": "mp4",

            # Don't keep partial files
            "continuedl": True

        }


        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = ydl.extract_info(
                url,
                download=True
            )

            downloaded_path = ydl.prepare_filename(info)


            # yt-dlp may change extension after merging
            possible_files = []

            base_name = os.path.splitext(
                downloaded_path
            )[0]


            for extension in [
                ".mp4",
                ".webm",
                ".mkv",
                ".mov"
            ]:

                candidate = (
                    base_name +
                    extension
                )

                if os.path.exists(candidate):

                    possible_files.append(
                        candidate
                    )


            if possible_files:

                downloaded_path = possible_files[0]


            if not os.path.exists(downloaded_path):

                # Search temp directory as fallback
                files = os.listdir(temp_dir)

                if not files:

                    raise Exception(
                        "Downloaded file could not be found."
                    )

                downloaded_path = os.path.join(
                    temp_dir,
                    files[0]
                )


        filename = clean_filename(
            info.get("title") or "facebook_video"
        )


        # Make sure extension matches actual file
        extension = os.path.splitext(
            downloaded_path
        )[1].lower()


        if extension not in [
            ".mp4",
            ".webm",
            ".mkv",
            ".mov"
        ]:

            extension = ".mp4"


        final_filename = (
            filename +
            extension
        )


        return send_file(

            downloaded_path,

            as_attachment=True,

            download_name=final_filename,

            mimetype="video/mp4"

            if extension == ".mp4"
            else "application/octet-stream"

        )


    except yt_dlp.utils.DownloadError as e:

        print("Download Error:", e)

        return jsonify({

            "success": False,

            "error": (
                "Download failed. The video may be "
                "private, deleted, unavailable, "
                "or the selected quality may not "
                "be available."
            )

        }), 400


    except Exception as e:

        print("Download Error:", e)

        return jsonify({

            "success": False,

            "error": (
                "Unable to download this video."
            )

        }), 500


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )

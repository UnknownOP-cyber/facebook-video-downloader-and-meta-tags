from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import yt_dlp
import re
from urllib.parse import urlparse


app = Flask(__name__)
CORS(app)


def is_valid_facebook_url(url):
    """
    Validate that the provided URL belongs to Facebook.
    """

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
    """
    Extract hashtags from caption/description.
    """

    if not text:
        return []

    hashtags = re.findall(r'#\w+', text)

    # Remove duplicates while keeping order
    unique_tags = []

    for tag in hashtags:
        if tag not in unique_tags:
            unique_tags.append(tag)

    return unique_tags


@app.route("/")
def home():
    return render_template("index.html")


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


        # yt-dlp configuration
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,

            # Do not download video
            "noplaylist": True,

            # Basic network settings
            "socket_timeout": 20,
        }


        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        # Caption / main description
        description = info.get("description") or ""

        # Facebook may provide title separately
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

        # Extract hashtags from description
        hashtags = extract_hashtags(description)

        response_data = {
            "success": True,

            "title": title,

            "caption": description,

            "description": description,

            "tags": hashtags,

            "author": uploader,

            "upload_date": upload_date,

            "thumbnail": thumbnail,

            "original_url": url
        }


        return jsonify(response_data), 200


    except yt_dlp.utils.DownloadError as e:

        error_message = str(e)

        return jsonify({
            "success": False,
            "error": (
                "Unable to fetch this video. It may be private, "
                "deleted, login-restricted, unavailable, or unsupported."
            )
        }), 400


    except Exception as e:

        print("Server Error:", str(e))

        return jsonify({
            "success": False,
            "error": "Something went wrong while fetching video information."
        }), 500


if __name__ == "__main__":

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )
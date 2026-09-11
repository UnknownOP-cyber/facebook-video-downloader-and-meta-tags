const facebookUrl =
    document.getElementById("facebookUrl");

const fetchButton =
    document.getElementById("fetchButton");

const skeleton =
    document.getElementById("skeleton");

const results =
    document.getElementById("results");

const themeToggle =
    document.getElementById("themeToggle");

const themeIcon =
    document.getElementById("themeIcon");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");

const thumbnail =
    document.getElementById("thumbnail");

const videoTitle =
    document.getElementById("videoTitle");

const author =
    document.getElementById("author");

const uploadDate =
    document.getElementById("uploadDate");

const caption =
    document.getElementById("caption");

const description =
    document.getElementById("description");

const tags =
    document.getElementById("tags");

const noTags =
    document.getElementById("noTags");

const downloadVideoButton =
    document.getElementById(
        "downloadVideoButton"
    );

const qualityModal =
    document.getElementById(
        "qualityModal"
    );

const qualityList =
    document.getElementById(
        "qualityList"
    );

const closeQualityModal =
    document.getElementById(
        "closeQualityModal"
    );


/* =========================================
   CURRENT VIDEO
========================================= */

let currentVideoUrl = "";



/* =========================================
   THEME
========================================= */

function loadTheme() {

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {

        document.documentElement
            .classList.add("dark");

    }

}


function updateThemeIcon() {

    const isDark =
        document.documentElement
            .classList.contains("dark");


    themeIcon.setAttribute(
        "data-lucide",
        isDark ? "sun" : "moon"
    );


    lucide.createIcons();

}


themeToggle.addEventListener(
    "click",
    () => {

        document.documentElement
            .classList.toggle("dark");


        const isDark =
            document.documentElement
                .classList.contains("dark");


        localStorage.setItem(
            "theme",
            isDark ? "dark" : "light"
        );


        updateThemeIcon();

    }
);


loadTheme();

lucide.createIcons();

updateThemeIcon();



/* =========================================
   TOAST
========================================= */

function showToast(
    message,
    type = "success"
) {

    toastMessage.textContent =
        message;


    toast.classList.remove(
        "translate-y-32",
        "opacity-0"
    );


    if (type === "error") {

        toast.classList.add(
            "bg-red-600"
        );

    }
    else {

        toast.classList.remove(
            "bg-red-600"
        );

    }


    setTimeout(() => {

        toast.classList.add(
            "translate-y-32",
            "opacity-0"
        );

    }, 3000);

}



/* =========================================
   LOADING
========================================= */

function setLoading(isLoading) {

    fetchButton.disabled =
        isLoading;


    if (isLoading) {

        fetchButton.innerHTML = `

            <svg
                class="animate-spin w-5 h-5"
                viewBox="0 0 24 24"
            >

                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                ></circle>

                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="
                        M4 12a8 8 0 018-8v4
                        a4 4 0 00-4 4H4z
                    "
                ></path>

            </svg>

            <span>
                Fetching...
            </span>

        `;


        skeleton.classList.remove(
            "hidden"
        );

        results.classList.add(
            "hidden"
        );

    }
    else {

        fetchButton.innerHTML = `

            <i
                data-lucide="search"
                class="w-5 h-5"
            ></i>

            <span>
                Fetch Info
            </span>

        `;


        skeleton.classList.add(
            "hidden"
        );


        lucide.createIcons();

    }

}



/* =========================================
   DATE
========================================= */

function formatDate(
    dateString
) {

    if (!dateString) {

        return "Not available";

    }


    if (dateString.length === 8) {

        const year =
            dateString.substring(
                0,
                4
            );

        const month =
            dateString.substring(
                4,
                6
            );

        const day =
            dateString.substring(
                6,
                8
            );


        const date = new Date(
            `${year}-${month}-${day}`
        );


        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    }


    return dateString;

}



/* =========================================
   DISPLAY RESULTS
========================================= */

function displayResults(data) {

    currentVideoUrl =
        data.original_url;


    videoTitle.textContent =
        data.title ||
        "Facebook Video";


    author.textContent =
        data.author ||
        "Unknown";


    uploadDate.textContent =
        formatDate(
            data.upload_date
        );


    caption.textContent =
        data.caption ||
        "No caption available.";


    description.textContent =
        data.description ||
        "No description available.";


    if (data.thumbnail) {

        thumbnail.src =
            data.thumbnail;

        thumbnail.style.display =
            "block";

    }
    else {

        thumbnail.removeAttribute(
            "src"
        );

        thumbnail.style.display =
            "none";

    }


    tags.innerHTML = "";


    if (
        data.tags &&
        data.tags.length > 0
    ) {

        noTags.classList.add(
            "hidden"
        );


        data.tags.forEach(tag => {

            const tagElement =
                document.createElement(
                    "span"
                );


            tagElement.textContent =
                tag;


            tagElement.className = `
                px-3
                py-1.5
                rounded-full
                text-sm
                font-medium
                bg-indigo-100
                dark:bg-indigo-500/10
                text-indigo-600
                dark:text-indigo-400
            `;


            tags.appendChild(
                tagElement
            );

        });

    }
    else {

        noTags.classList.remove(
            "hidden"
        );

    }


    results.classList.remove(
        "hidden"
    );


    lucide.createIcons();


    setTimeout(() => {

        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}



/* =========================================
   FETCH METADATA
========================================= */

async function fetchVideoInfo() {

    const url =
        facebookUrl.value.trim();


    if (!url) {

        showToast(
            "Please enter a Facebook URL.",
            "error"
        );

        return;

    }


    if (
        !url.includes(
            "facebook.com"
        ) &&
        !url.includes(
            "fb.watch"
        )
    ) {

        showToast(
            "Invalid Facebook URL.",
            "error"
        );

        return;

    }


    setLoading(true);


    try {

        const response =
            await fetch(
                "/fetch",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: url
                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to fetch video information."
            );

        }


        displayResults(
            data
        );


        showToast(
            "Video information fetched successfully!"
        );

    }
    catch (error) {

        console.error(error);


        showToast(
            error.message ||
            "Something went wrong.",
            "error"
        );

    }
    finally {

        setLoading(false);

    }

}



/* =========================================
   FETCH BUTTON
========================================= */

fetchButton.addEventListener(
    "click",
    fetchVideoInfo
);


facebookUrl.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            fetchVideoInfo();

        }

    }
);



/* =========================================
   OPEN QUALITY MODAL
========================================= */

downloadVideoButton.addEventListener(
    "click",
    async () => {

        if (!currentVideoUrl) {

            showToast(
                "Please fetch a video first.",
                "error"
            );

            return;

        }


        qualityModal.classList.remove(
            "hidden"
        );

        qualityModal.classList.add(
            "flex"
        );


        qualityList.innerHTML = `

            <div
                class="
                    flex
                    flex-col
                    items-center
                    justify-center
                    py-10
                    gap-4
                "
            >

                <div
                    class="
                        w-8
                        h-8
                        border-4
                        border-indigo-200
                        border-t-indigo-600
                        rounded-full
                        animate-spin
                    "
                ></div>

                <p
                    class="
                        text-sm
                        text-slate-500
                    "
                >
                    Loading qualities...
                </p>

            </div>

        `;


        try {

            const response =
                await fetch(
                    "/formats",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            url:
                                currentVideoUrl

                        })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to load qualities."
                );

            }


            renderQualityOptions(
                data.formats
            );

        }
        catch (error) {

            qualityList.innerHTML = `

                <div
                    class="
                        text-center
                        py-8
                    "
                >

                    <p
                        class="
                            text-red-500
                            text-sm
                        "
                    >
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }
);



/* =========================================
   QUALITY OPTIONS
========================================= */

function renderQualityOptions(
    formats
) {

    qualityList.innerHTML = "";


    formats.forEach(
        format => {

            const button =
                document.createElement(
                    "button"
                );


            button.className = `

                w-full

                p-4

                rounded-2xl

                border

                border-slate-200

                dark:border-slate-700

                bg-slate-50

                dark:bg-slate-800

                hover:border-indigo-500

                hover:bg-indigo-50

                dark:hover:bg-indigo-500/10

                transition

                text-left

                flex

                items-center

                justify-between

                gap-4

            `;


            const audioText =
                format.has_audio
                    ? "Video + Audio"
                    : "Video + Audio merged";


            button.innerHTML = `

                <div
                    class="
                        flex
                        items-center
                        gap-3
                    "
                >

                    <div
                        class="
                            w-11
                            h-11
                            rounded-xl
                            bg-indigo-100
                            dark:bg-indigo-500/10
                            text-indigo-600
                            flex
                            items-center
                            justify-center
                            font-bold
                            text-xs
                        "
                    >
                        ${format.height}p
                    </div>


                    <div>

                        <p
                            class="
                                font-semibold
                            "
                        >
                            ${format.height}p
                        </p>

                        <p
                            class="
                                text-xs
                                text-slate-500
                                mt-1
                            "
                        >
                            ${escapeHtml(
                                audioText
                            )}
                            ·
                            ${escapeHtml(
                                format.ext
                            )}
                        </p>

                    </div>

                </div>


                <i
                    data-lucide="download"
                    class="
                        w-5
                        h-5
                        text-indigo-500
                    "
                ></i>

            `;


            button.addEventListener(
                "click",
                () => {

                    downloadSelectedVideo(
       //                 format.format_id,
                        format.height
                    );

                }
            );


            qualityList.appendChild(
                button
            );

        }
    );


    lucide.createIcons();

}



/* =========================================
   DOWNLOAD SELECTED QUALITY
========================================= */

async function downloadSelectedVideo(
  //  formatId,
    height
) {

    closeModal();


    showToast(
        `Preparing ${height}p video...`
    );


    try {

        const response =
            await fetch(
                "/download",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        url:
                            currentVideoUrl,
                        height:
                            height
                       // format_id:
                         //   formatId

                    })

                }
            );


        if (!response.ok) {

            const data =
                await response.json();


            throw new Error(
                data.error ||
                "Download failed."
            );

        }


        const blob =
            await response.blob();


        const contentDisposition =
            response.headers.get(
                "Content-Disposition"
            );


        let filename =
            `facebook-video-${height}p.mp4`;


        if (
            contentDisposition
        ) {

            const match =
                contentDisposition.match(
                    /filename="?([^"]+)"?/i
                );


            if (match) {

                filename =
                    match[1];

            }

        }


        const blobUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            blobUrl;

        link.download =
            filename;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
            blobUrl
        );


        showToast(
            `${height}p video downloaded!`
        );

    }
    catch (error) {

        console.error(error);


        showToast(
            error.message ||
            "Download failed.",
            "error"
        );

    }

}



/* =========================================
   CLOSE MODAL
========================================= */

function closeModal() {

    qualityModal.classList.add(
        "hidden"
    );

    qualityModal.classList.remove(
        "flex"
    );

}


closeQualityModal.addEventListener(
    "click",
    closeModal
);


qualityModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            qualityModal
        ) {

            closeModal();

        }

    }
);



/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text ?? "";


    return div.innerHTML;

}



/* =========================================
   COPY BUTTONS
========================================= */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".copy-btn"
            );


        if (!button) return;


        const target =
            button.dataset.target;


        let textToCopy = "";


        if (
            target === "caption"
        ) {

            textToCopy =
                caption.textContent;

        }


        if (
            target === "description"
        ) {

            textToCopy =
                description.textContent;

        }


        if (
            target === "tags"
        ) {

            textToCopy =
                Array.from(
                    tags.querySelectorAll(
                        "span"
                    )
                )
                .map(
                    tag =>
                        tag.textContent
                )
                .join(" ");

        }


        if (!textToCopy) {

            showToast(
                "Nothing to copy.",
                "error"
            );

            return;

        }


        try {

            await navigator.clipboard
                .writeText(
                    textToCopy
                );


            showToast(
                "Copied!"
            );

        }
        catch (error) {

            showToast(
                "Unable to copy.",
                "error"
            );

        }

    }
);

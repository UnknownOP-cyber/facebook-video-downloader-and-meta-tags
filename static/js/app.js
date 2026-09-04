const facebookUrl = document.getElementById("facebookUrl");

const fetchButton = document.getElementById("fetchButton");

const buttonText = document.getElementById("buttonText");

const skeleton = document.getElementById("skeleton");

const results = document.getElementById("results");

const themeToggle = document.getElementById("themeToggle");

const themeIcon = document.getElementById("themeIcon");

const toast = document.getElementById("toast");

const toastMessage = document.getElementById("toastMessage");

const thumbnail = document.getElementById("thumbnail");

const videoTitle = document.getElementById("videoTitle");

const author = document.getElementById("author");

const uploadDate = document.getElementById("uploadDate");

const caption = document.getElementById("caption");

const description = document.getElementById("description");

const tags = document.getElementById("tags");

const noTags = document.getElementById("noTags");



/* ===============================
   THEME
================================ */

function loadTheme() {

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {

        document.documentElement.classList.add("dark");

    }

}


function updateThemeIcon() {

    const isDark =
        document.documentElement.classList.contains("dark");

    themeIcon.setAttribute(
        "data-lucide",
        isDark ? "sun" : "moon"
    );

    lucide.createIcons();

}


themeToggle.addEventListener("click", () => {

    document.documentElement.classList.toggle("dark");

    const isDark =
        document.documentElement.classList.contains("dark");

    localStorage.setItem(
        "theme",
        isDark ? "dark" : "light"
    );

    updateThemeIcon();

});


loadTheme();

lucide.createIcons();

updateThemeIcon();



/* ===============================
   TOAST
================================ */

function showToast(message, type = "success") {

    toastMessage.textContent = message;

    toast.classList.remove(
        "translate-y-32",
        "opacity-0"
    );


    if (type === "error") {

        toast.classList.add("bg-red-600");

    }
    else {

        toast.classList.remove("bg-red-600");

    }


    setTimeout(() => {

        toast.classList.add(
            "translate-y-32",
            "opacity-0"
        );

    }, 3000);

}



/* ===============================
   LOADING STATE
================================ */

function setLoading(isLoading) {

    fetchButton.disabled = isLoading;


    if (isLoading) {

        buttonText.textContent = "Fetching...";


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

            <span>Fetching...</span>
        `;


        skeleton.classList.remove("hidden");

        results.classList.add("hidden");


    }
    else {

        fetchButton.innerHTML = `
            <i
                data-lucide="search"
                class="w-5 h-5"
            ></i>

            <span>Fetch Info</span>
        `;

        skeleton.classList.add("hidden");

        lucide.createIcons();

    }

}



/* ===============================
   DATE FORMAT
================================ */

function formatDate(dateString) {

    if (!dateString) {

        return "Not available";

    }


    if (dateString.length === 8) {

        const year = dateString.substring(0, 4);

        const month = dateString.substring(4, 6);

        const day = dateString.substring(6, 8);


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



/* ===============================
   DISPLAY RESULTS
================================ */

function displayResults(data) {

    videoTitle.textContent =
        data.title || "Facebook Video";


    author.textContent =
        data.author || "Unknown";


    uploadDate.textContent =
        formatDate(data.upload_date);


    caption.textContent =
        data.caption || "No caption available.";


    description.textContent =
        data.description ||
        "No description available.";


    /* Thumbnail */

    if (data.thumbnail) {

        thumbnail.src = data.thumbnail;

        thumbnail.style.display = "block";

    }
    else {

        thumbnail.removeAttribute("src");

        thumbnail.style.display = "none";

    }



    /* Tags */

    tags.innerHTML = "";


    if (
        data.tags &&
        data.tags.length > 0
    ) {

        noTags.classList.add("hidden");


        data.tags.forEach(tag => {

            const tagElement =
                document.createElement("span");


            tagElement.textContent = tag;


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


            tags.appendChild(tagElement);

        });

    }
    else {

        noTags.classList.remove("hidden");

    }


    results.classList.remove("hidden");



    setTimeout(() => {

        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);




    lucide.createIcons();

}



/* ===============================
   FETCH VIDEO
================================ */

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
        !url.includes("facebook.com") &&
        !url.includes("fb.watch")
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
            await fetch("/fetch", {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    url: url
                })

            });


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to fetch video information."
            );

        }


        displayResults(data);


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



/* ===============================
   BUTTON EVENTS
================================ */

fetchButton.addEventListener(
    "click",
    fetchVideoInfo
);


facebookUrl.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            fetchVideoInfo();

        }

    }
);




/* ===============================
   COPY FUNCTIONALITY
================================ */

document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(".copy-btn");


        if (!button) return;


        const target =
            button.dataset.target;


        let textToCopy = "";


        if (target === "caption") {

            textToCopy =
                caption.textContent;

        }


        if (target === "description") {

            textToCopy =
                description.textContent;

        }


        if (target === "tags") {

            textToCopy =
                Array.from(
                    tags.querySelectorAll("span")
                )
                .map(tag => tag.textContent)
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

            await navigator.clipboard.writeText(
                textToCopy
            );


            showToast("Copied!");

        }
        catch (error) {

            showToast(
                "Unable to copy.",
                "error"
            );

        }

    }
);
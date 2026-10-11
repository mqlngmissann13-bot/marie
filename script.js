
"use strict";

/* ========================================
   MARIE — LITTLE THOUGHTS
   Fresh storage, separate from old Marie.
======================================== */

const STORAGE = {
  posts: "marie_rebuilt_posts",
  diary: "marie_rebuilt_diary",
  profile: "marie_rebuilt_profile"
};

const DEFAULT_PROFILE = {
  name: "Marie",
  handle: "@littlethoughts",
  bio: "",
  photo: ""
};

const $ = (selector) => document.querySelector(selector);

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error("Marie could not load:", key, error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Marie could not save:", key, error);
    showToast(
      "Could not save. Your browser storage may be full."
    );
    return false;
  }
}

let posts = loadData(STORAGE.posts, []);
let diaryEntries = loadData(STORAGE.diary, []);
let profile = {
  ...DEFAULT_PROFILE,
  ...loadData(STORAGE.profile, {})
};

if (!Array.isArray(posts)) posts = [];
if (!Array.isArray(diaryEntries)) diaryEntries = [];

/* Make sure saved records have usable IDs. */

posts = posts.filter(
  (post) =>
    post &&
    typeof post.id === "string" &&
    typeof post.content === "string"
);

diaryEntries = diaryEntries.filter(
  (entry) =>
    entry &&
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.content === "string"
);

/* GENERAL HELPERS */

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function createId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

let toastTimeout;

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function savePosts() {
  return saveData(STORAGE.posts, posts);
}

function saveDiary() {
  return saveData(STORAGE.diary, diaryEntries);
}

function saveProfile() {
  return saveData(STORAGE.profile, profile);
}

/* NAVIGATION */

function openPage(pageName) {
  const validPages = ["home", "diary", "me"];

  if (!validPages.includes(pageName)) {
    pageName = "home";
  }

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle(
      "active",
      page.id === pageName + "Page"
    );
  });

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.page);
  });
});

$("#settingsButton").addEventListener("click", () => {
  openPage("me");
});

/* HOME — TEXT-ONLY POSTS */

const postContent = $("#postContent");
const characterCount = $("#characterCount");

postContent.addEventListener("input", () => {
  characterCount.textContent =
    `${postContent.value.length} / 1000`;
});

$("#postForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const content = postContent.value.trim();

  if (!content) {
    showToast("Write a little thought first.");
    return;
  }

  const post = {
    id: createId(),
    content,
    liked: false,
    likes: 0,
    createdAt: Date.now()
  };

  posts.unshift(post);

  if (!savePosts()) {
    posts.shift();
    return;
  }

  postContent.value = "";
  characterCount.textContent = "0 / 1000";

  renderPosts();
  showToast("Your thought has been published.");
});

function renderPosts() {
  const list = $("#feedList");
  list.replaceChildren();

  $("#postTotal").textContent =
    `${posts.length} ${
      posts.length === 1 ? "thought" : "thoughts"
    }`;

  if (posts.length === 0) {
    const empty = makeElement("div", "empty-state");

    empty.append(
      makeElement("strong", "", "A quiet little beginning"),
      makeElement(
        "p",
        "",
        "Your first thought can live here whenever you're ready."
      )
    );

    list.append(empty);
    return;
  }

  posts.forEach((post) => {
    const card = makeElement("article", "post-card");

    const header = makeElement("div", "post-header");
    const logo = makeElement("div", "mini-logo", "M");
    const author = makeElement("div", "post-author");

    author.append(
      makeElement("strong", "", profile.name || "Marie"),
      makeElement(
        "span",
        "",
        `${profile.handle || "@littlethoughts"} · ${formatDate(
          post.createdAt
        )}`
      )
    );

    header.append(logo, author);

    const content = makeElement(
      "p",
      "post-content",
      post.content
    );

    const actions = makeElement("div", "post-actions");

    const likeButton = makeElement(
      "button",
      `action-button${post.liked ? " liked" : ""}`,
      `${post.liked ? "♥" : "♡"} Like · ${Number(post.likes) || 0}`
    );

    likeButton.type = "button";
    likeButton.setAttribute(
      "aria-pressed",
      String(Boolean(post.liked))
    );

    likeButton.addEventListener("click", () => {
      const previousLiked = Boolean(post.liked);
      const previousLikes = Number(post.likes) || 0;

      post.liked = !previousLiked;
      post.likes = Math.max(
        0,
        previousLikes + (post.liked ? 1 : -1)
      );

      if (!savePosts()) {
        post.liked = previousLiked;
        post.likes = previousLikes;
        return;
      }

      renderPosts();
    });

    const deleteButton = makeElement(
      "button",
      "action-button delete-button",
      "Delete"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Delete this thought? This cannot be undone."
      );

      if (!confirmed) return;

      const previousPosts = posts;
      posts = posts.filter((item) => item.id !== post.id);

      if (!savePosts()) {
        posts = previousPosts;
        return;
      }

      renderPosts();
      showToast("Thought deleted.");
    });

    actions.append(likeButton, deleteButton);
    card.append(header, content, actions);
    list.append(card);
  });
}

/* DIARY */

$("#diaryForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("#diaryTitle").value.trim();
  const content = $("#diaryContent").value.trim();

  if (!title || !content) {
    showToast("Add a title and write your entry.");
    return;
  }

  const entry = {
    id: createId(),
    title,
    content,
    createdAt: Date.now()
  };

  diaryEntries.unshift(entry);

  if (!saveDiary()) {
    diaryEntries.shift();
    return;
  }

  $("#diaryForm").reset();

  renderDiary();
  showToast("Diary entry saved.");
});

function renderDiary() {
  const list = $("#diaryList");
  list.replaceChildren();

  $("#diaryTotal").textContent =
    `${diaryEntries.length} ${
      diaryEntries.length === 1 ? "entry" : "entries"
    }`;

  if (diaryEntries.length === 0) {
    const empty = makeElement("div", "empty-state");

    empty.append(
      makeElement("strong", "", "Dear diary..."),
      makeElement(
        "p",
        "",
        "Your personal entries will be kept here."
      )
    );

    list.append(empty);
    return;
  }

  diaryEntries.forEach((entry) => {
    const card = makeElement("article", "diary-card");

    const title = makeElement("h4", "", entry.title);
    const date = makeElement(
      "div",
      "diary-date",
      formatDate(entry.createdAt)
    );

    const content = makeElement(
      "p",
      "diary-content",
      entry.content
    );

    const actions = makeElement("div", "post-actions");

    const deleteButton = makeElement(
      "button",
      "action-button delete-button",
      "Delete entry"
    );

    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Delete this diary entry? This cannot be undone."
      );

      if (!confirmed) return;

      const previousEntries = diaryEntries;

      diaryEntries = diaryEntries.filter(
        (item) => item.id !== entry.id
      );

      if (!saveDiary()) {
        diaryEntries = previousEntries;
        return;
      }

      renderDiary();
      showToast("Diary entry deleted.");
    });

    actions.append(deleteButton);
    card.append(title, date, content, actions);
    list.append(card);
  });
}

/* PROFILE */

function renderProfile() {
  $("#profileName").value = profile.name || "";
  $("#profileHandle").value = profile.handle || "";
  $("#profileBio").value = profile.bio || "";

  const photo = $("#profilePhoto");
  const placeholder = $("#profilePlaceholder");

  if (profile.photo) {
    photo.src = profile.photo;
    photo.classList.remove("hidden");
    placeholder.classList.add("hidden");
  } else {
    photo.removeAttribute("src");
    photo.classList.add("hidden");
    placeholder.classList.remove("hidden");
  }
}

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("#profileName").value.trim();
  const rawHandle = $("#profileHandle").value.trim();
  const bio = $("#profileBio").value.trim();

  if (!name) {
    showToast("Please enter a display name.");
    return;
  }

  const previousProfile = { ...profile };

  let handle = rawHandle || "@littlethoughts";

  if (!handle.startsWith("@")) {
    handle = "@" + handle;
  }

  profile = {
    ...profile,
    name,
    handle,
    bio
  };

  if (!saveProfile()) {
    profile = previousProfile;
    renderProfile();
    return;
  }

  renderProfile();
  renderPosts();
  showToast("Your profile has been saved.");
});

/* PROFILE PHOTO — GALLERY ONLY */

$("#photoInput").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image.");
    event.target.value = "";
    return;
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    showToast("Choose a photo smaller than 5 MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      showToast("Could not read that photo.");
      return;
    }

    const image = new Image();

    image.onload = () => {
      try {
        const maxDimension = 600;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
          1,
          Math.round(image.width * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(image.height * scale)
        );

        const context = canvas.getContext("2d");

        if (!context) {
          showToast("Could not process that photo.");
          return;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const compressedPhoto = canvas.toDataURL(
          "image/jpeg",
          0.82
        );

        const previousProfile = { ...profile };

        profile.photo = compressedPhoto;

        if (!saveProfile()) {
          profile = previousProfile;
          renderProfile();
          return;
        }

        renderProfile();
        showToast("Profile photo updated.");
      } catch (error) {
        console.error("Photo processing failed:", error);
        showToast("Could not save that photo.");
      }
    };

    image.onerror = () => {
      showToast("Could not open that photo. Try another.");
    };

    image.src = reader.result;
  };

  reader.onerror = () => {
    showToast("Could not read that photo.");
  };

  reader.readAsDataURL(file);
});

/* START MARIE */

renderPosts();
renderDiary();
renderProfile();
openPage("home");

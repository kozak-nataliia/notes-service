const API_BASE_URL = "http://localhost:3000/api";
const CURRENT_USER_KEY = "notes-service-current-user";

function getCurrentUser() {
    try {
        return JSON.parse(window.localStorage.getItem(CURRENT_USER_KEY));
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    window.localStorage.removeItem(CURRENT_USER_KEY);
}

function getPageName() {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
}

function getQueryId() {
    return new URLSearchParams(window.location.search).get("id");
}

function redirectTo(page, id) {
    const target = id ? `${page}?id=${id}` : page;
    window.location.href = target;
}

function showFeedback(element, message, type = "success") {
    if (!element) {
        return;
    }

    element.hidden = false;
    element.className = `alert alert--${type}`;
    element.textContent = message;
}

function hideFeedback(element) {
    if (!element) {
        return;
    }

    element.hidden = true;
    element.textContent = "";
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

async function loadUsers() {
    return request("/users");
}

async function loadNotes(userId) {
    const suffix = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return request(`/notes${suffix}`);
}

function wireLogoutLinks() {
    document.querySelectorAll(".page-nav__link--logout").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            clearCurrentUser();
            redirectTo("login.html");
        });
    });
}

function updateNavigation() {
    const currentUser = getCurrentUser();

    document.querySelectorAll(".page-nav__link--logout").forEach((link) => {
        link.hidden = !currentUser;
    });
}

function formatRole(role) {
    return role === "Admin"
        ? '<span class="badge badge--admin">Admin</span>'
        : '<span class="badge">Regular</span>';
}

function formatTags(tags) {
    return tags ? tags : "No tags";
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "Not available";
    }

    return new Date(dateValue.replace(" ", "T")).toLocaleString();
}

async function initLoginPage() {
    const form = document.querySelector("#login-form");
    const feedback = document.querySelector("#login-feedback");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const payload = {
            username: String(formData.get("username") || "").trim(),
            password: String(formData.get("password") || "")
        };

        try {
            const user = await request("/auth/login", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            setCurrentUser(user);
            redirectTo("notes.html");
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

function renderUsersList(users) {
    const list = document.querySelector("#users-list");

    if (!list) {
        return;
    }

    if (!users.length) {
        list.innerHTML = '<p class="item-text">No users found yet.</p>';
        return;
    }

    list.innerHTML = users
        .map(
            (user, index) => `
                <article class="user-item${index === 0 ? " user-item--active" : ""}">
                    <div class="user-item__top">
                        <h3 class="item-title">${user.username}</h3>
                        <span class="details-value">${formatRole(user.role)}</span>
                    </div>
                    <p class="item-text">Created notes: ${user.notes_count}</p>
                    <div class="actions actions--small">
                        <a class="button button--secondary" href="user-details.html?id=${user.id}">View</a>
                        <a class="button button--secondary" href="user-edit.html?id=${user.id}">Edit</a>
                    </div>
                </article>
            `
        )
        .join("");
}

async function initUsersPage() {
    const form = document.querySelector("#create-user-form");
    const feedback = document.querySelector("#users-feedback");

    if (!form) {
        return;
    }

    const refreshUsers = async () => {
        const users = await loadUsers();
        renderUsersList(users);
    };

    await refreshUsers();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (password !== confirmPassword) {
            showFeedback(feedback, "Passwords must match.", "error");
            return;
        }

        const payload = {
            username: String(formData.get("username") || "").trim(),
            password,
            role: String(formData.get("role") || "Regular")
        };

        try {
            await request("/users", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            form.reset();
            showFeedback(feedback, "User created successfully.");
            await refreshUsers();
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

async function initUserDetailsPage() {
    const userId = getQueryId();

    if (!userId) {
        return;
    }

    const feedback = document.querySelector("#user-details-feedback");

    try {
        const user = await request(`/users/${userId}`);

        document.querySelector("#user-details-title").textContent = user.username;
        document.querySelector("#user-username").textContent = user.username;
        document.querySelector("#user-role").innerHTML = formatRole(user.role);
        document.querySelector("#user-notes-count").textContent = user.notes_count;

        const editLink = document.querySelector("#edit-user-link");
        const deleteButton = document.querySelector("#delete-user-button");

        editLink.href = `user-edit.html?id=${user.id}`;
        deleteButton.addEventListener("click", async () => {
            try {
                await request(`/users/${user.id}`, { method: "DELETE" });
                redirectTo("users.html");
            } catch (error) {
                showFeedback(feedback, error.message, "error");
            }
        });
    } catch (error) {
        showFeedback(feedback, error.message, "error");
    }
}

async function initUserEditPage() {
    const form = document.querySelector("#edit-user-form");
    const feedback = document.querySelector("#user-edit-feedback");
    const userId = getQueryId();

    if (!form || !userId) {
        return;
    }

    try {
        const user = await request(`/users/${userId}`);
        form.elements.username.value = user.username;
        form.elements.role.value = user.role;
    } catch (error) {
        showFeedback(feedback, error.message, "error");
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (!password) {
            showFeedback(feedback, "Password is required.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showFeedback(feedback, "Passwords must match.", "error");
            return;
        }

        const payload = {
            username: String(formData.get("username") || "").trim(),
            password,
            role: String(formData.get("role") || "Regular")
        };

        try {
            await request(`/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showFeedback(feedback, "User updated successfully.");
            window.setTimeout(() => redirectTo("user-details.html", userId), 700);
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

function populateOwnerSelect(select, users, selectedUserId) {
    if (!select) {
        return;
    }

    select.innerHTML = users
        .map(
            (user) => `
                <option value="${user.id}"${Number(selectedUserId) === Number(user.id) ? " selected" : ""}>
                    ${user.username}
                </option>
            `
        )
        .join("");
}

function renderNotesList(notes) {
    const list = document.querySelector("#notes-list");

    if (!list) {
        return;
    }

    if (!notes.length) {
        list.innerHTML = '<p class="item-text">No notes found yet.</p>';
        return;
    }

    list.innerHTML = notes
        .map(
            (note, index) => `
                <article class="note-item${index === 0 ? " note-item--active" : ""}">
                    <div class="note-item__top">
                        <h3 class="item-title">${note.title}</h3>
                        <span class="badge">${note.username || "Unknown owner"}</span>
                    </div>
                    <p class="item-text">${note.content}</p>
                    <div class="actions actions--small">
                        <a class="button button--secondary" href="note-details.html?id=${note.id}">View</a>
                        <a class="button button--secondary" href="note-edit.html?id=${note.id}">Edit</a>
                    </div>
                </article>
            `
        )
        .join("");
}

function renderPreview(note) {
    document.querySelector("#preview-note-title").textContent = note.title;
    document.querySelector("#preview-owner").textContent = note.username || "Unknown owner";
    document.querySelector("#preview-tags").textContent = formatTags(note.tags);
    document.querySelector("#preview-updated").textContent = formatDate(note.updated_at);
    document.querySelector("#preview-content").textContent = note.content;
    document.querySelector("#preview-open").href = `note-details.html?id=${note.id}`;
    document.querySelector("#preview-edit").href = `note-edit.html?id=${note.id}`;

    const deleteButton = document.querySelector("#preview-delete");
    deleteButton.dataset.noteId = String(note.id);
}

async function initNotesPage() {
    const feedback = document.querySelector("#notes-feedback");
    const currentUser = getCurrentUser();

    try {
        const notes = await loadNotes(currentUser ? currentUser.id : null);
        renderNotesList(notes);

        if (notes[0]) {
            renderPreview(notes[0]);
        }

        const deleteButton = document.querySelector("#preview-delete");
        deleteButton.addEventListener("click", async () => {
            const noteId = deleteButton.dataset.noteId;

            if (!noteId) {
                return;
            }

            try {
                await request(`/notes/${noteId}`, { method: "DELETE" });
                showFeedback(feedback, "Note deleted successfully.");
                window.location.reload();
            } catch (error) {
                showFeedback(feedback, error.message, "error");
            }
        });
    } catch (error) {
        showFeedback(feedback, error.message, "error");
    }
}

async function initNoteDetailsPage() {
    const noteId = getQueryId();
    const feedback = document.querySelector("#note-details-feedback");

    if (!noteId) {
        return;
    }

    try {
        const note = await request(`/notes/${noteId}`);

        document.querySelector("#note-details-title").textContent = note.title;
        document.querySelector("#note-owner").textContent = note.username || "Unknown owner";
        document.querySelector("#note-tags").textContent = formatTags(note.tags);
        document.querySelector("#note-updated").textContent = formatDate(note.updated_at);
        document.querySelector("#note-content").textContent = note.content;
        document.querySelector("#edit-note-link").href = `note-edit.html?id=${note.id}`;

        document.querySelector("#delete-note-button").addEventListener("click", async () => {
            try {
                await request(`/notes/${note.id}`, { method: "DELETE" });
                redirectTo("notes.html");
            } catch (error) {
                showFeedback(feedback, error.message, "error");
            }
        });
    } catch (error) {
        showFeedback(feedback, error.message, "error");
    }
}

async function initNoteCreatePage() {
    const form = document.querySelector("#create-note-form");
    const feedback = document.querySelector("#note-create-feedback");

    if (!form) {
        return;
    }

    const users = await loadUsers();
    const currentUser = getCurrentUser();
    populateOwnerSelect(form.elements.userId, users, currentUser && currentUser.id);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const payload = {
            title: String(formData.get("title") || "").trim(),
            content: String(formData.get("content") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            user_id: Number(formData.get("userId"))
        };

        try {
            const note = await request("/notes", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showFeedback(feedback, "Note created successfully.");
            window.setTimeout(() => redirectTo("note-details.html", note.id), 700);
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

async function initNoteEditPage() {
    const form = document.querySelector("#edit-note-form");
    const feedback = document.querySelector("#note-edit-feedback");
    const noteId = getQueryId();

    if (!form || !noteId) {
        return;
    }

    try {
        const [users, note] = await Promise.all([
            loadUsers(),
            request(`/notes/${noteId}`)
        ]);

        populateOwnerSelect(form.elements.userId, users, note.user_id);
        form.elements.title.value = note.title;
        form.elements.content.value = note.content;
        form.elements.tags.value = note.tags || "";
        document.querySelector("#note-last-updated").textContent = formatDate(note.updated_at);
    } catch (error) {
        showFeedback(feedback, error.message, "error");
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const payload = {
            title: String(formData.get("title") || "").trim(),
            content: String(formData.get("content") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            user_id: Number(formData.get("userId"))
        };

        try {
            await request(`/notes/${noteId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showFeedback(feedback, "Note updated successfully.");
            window.setTimeout(() => redirectTo("note-details.html", noteId), 700);
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

async function initPage() {
    updateNavigation();
    wireLogoutLinks();

    const pageName = getPageName();

    if (pageName === "login.html") {
        await initLoginPage();
    }

    if (pageName === "users.html") {
        await initUsersPage();
    }

    if (pageName === "user-details.html") {
        await initUserDetailsPage();
    }

    if (pageName === "user-edit.html") {
        await initUserEditPage();
    }

    if (pageName === "notes.html") {
        await initNotesPage();
    }

    if (pageName === "note-details.html") {
        await initNoteDetailsPage();
    }

    if (pageName === "note-create.html") {
        await initNoteCreatePage();
    }

    if (pageName === "note-edit.html") {
        await initNoteEditPage();
    }
}

initPage().catch((error) => {
    console.error(error);
});

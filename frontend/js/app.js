const API_BASE_URL = "http://localhost:3000/api";
const CURRENT_USER_KEY = "notes-service-current-user";
const FLASH_MESSAGE_KEY = "notes-service-flash-message";

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

function setFlashMessage(message, type = "success", page = getPageName()) {
    window.sessionStorage.setItem(FLASH_MESSAGE_KEY, JSON.stringify({ message, type, page }));
}

function consumeFlashMessage() {
    try {
        const storedValue = window.sessionStorage.getItem(FLASH_MESSAGE_KEY);

        if (!storedValue) {
            return null;
        }

        const flash = JSON.parse(storedValue);

        if (flash.page && flash.page !== getPageName()) {
            return null;
        }

        window.sessionStorage.removeItem(FLASH_MESSAGE_KEY);
        return flash;
    } catch (error) {
        window.sessionStorage.removeItem(FLASH_MESSAGE_KEY);
        return null;
    }
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

function redirectWithFlash(page, message, id, type = "success") {
    setFlashMessage(message, type, page);
    redirectTo(page, id);
}

function reloadWithFlash(message, type = "success") {
    setFlashMessage(message, type, getPageName());
    window.location.reload();
}

function showFeedback(element, message, type = "success") {
    if (!element) {
        return;
    }

    if (element.feedbackTimer) {
        window.clearTimeout(element.feedbackTimer);
        element.feedbackTimer = null;
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

function showStoredFlashMessage(selector = '.alert[role="status"]') {
    const feedback = document.querySelector(selector);
    const flash = consumeFlashMessage();

    if (!feedback || !flash) {
        return;
    }

    showFeedback(feedback, flash.message, flash.type);
}

function isAdmin(user = getCurrentUser()) {
    return Boolean(user && user.role === "Admin");
}

function isSelf(userId) {
    const currentUser = getCurrentUser();
    return Boolean(currentUser && Number(currentUser.id) === Number(userId));
}

function canManageNote(note) {
    const currentUser = getCurrentUser();
    return Boolean(
        currentUser && (isAdmin(currentUser) || Number(note.user_id) === Number(currentUser.id))
    );
}

function requireLogin() {
    const pageName = getPageName();

    if (pageName === "login.html" || pageName === "register.html") {
        return true;
    }

    if (!getCurrentUser()) {
        redirectTo("login.html");
        return false;
    }

    return true;
}

function requireAdminAccess() {
    if (!isAdmin()) {
        redirectTo("notes.html");
        return false;
    }

    return true;
}

function updateNavigation() {
    const currentUser = getCurrentUser();
    const pageName = getPageName();

    if (pageName === 'login.html') {
        return;
    }

    if (pageName === 'register.html') {
        return;
    }

    document.querySelectorAll('.page-nav__link[href="login.html"]').forEach((link) => {
        if (!link.classList.contains("page-nav__link--logout")) {
            if (currentUser) {
                link.remove();
            }
        }
    });

    document.querySelectorAll('.page-nav__link[href="register.html"]').forEach((link) => {
        if (currentUser) {
            link.remove();
        }
    });

    document.querySelectorAll(".page-nav__link--logout").forEach((link) => {
        if (!currentUser) {
            link.remove();
        }
    });

    document.querySelectorAll('.page-nav__link[href="users.html"]').forEach((link) => {
        if (!isAdmin(currentUser)) {
            link.remove();
        }
    });

    document.querySelectorAll('.page-nav__link[href="notes.html"]').forEach((link) => {
        if (!currentUser) {
            link.remove();
        }
    });
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

function getAuthHeaders() {
    const currentUser = getCurrentUser();

    return currentUser
        ? {
            "x-user-id": String(currentUser.id)
        }
        : {};
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
            ...(options.headers || {})
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

function askForConfirmation(message) {
    return window.confirm(message);
}

function disableElement(element, disabled) {
    if (!element) {
        return;
    }

    element.disabled = disabled;
    if ("hidden" in element && disabled) {
        element.hidden = false;
    }
}

async function initLoginPage() {
    const loginForm = document.querySelector("#login-form");
    const loginFeedback = document.querySelector("#login-feedback");

    if (!loginForm) {
        return;
    }

    if (getCurrentUser()) {
        redirectTo("notes.html");
        return;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(loginFeedback);
        const formData = new FormData(loginForm);
        const payload = {
            username: String(formData.get("username") || "").trim(),
            password: String(formData.get("password") || "")
        };

        if (!payload.username || !payload.password) {
            showFeedback(loginFeedback, "Username and password are required.", "error");
            return;
        }

        try {
            const user = await request("/auth/login", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            setCurrentUser(user);
            redirectTo("notes.html");
        } catch (error) {
            showFeedback(loginFeedback, error.message, "error");
        }
    });
}

async function initRegisterPage() {
    const registerForm = document.querySelector("#register-form");
    const registerFeedback = document.querySelector("#register-feedback");

    if (!registerForm) {
        return;
    }

    if (getCurrentUser()) {
        redirectTo("notes.html");
        return;
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(registerFeedback);

        const formData = new FormData(registerForm);
        const payload = {
            username: String(formData.get("username") || "").trim(),
            password: String(formData.get("password") || ""),
            confirmPassword: String(formData.get("confirmPassword") || ""),
            role: String(formData.get("role") || "Regular")
        };

        if (!payload.username || !payload.password) {
            showFeedback(registerFeedback, "Username and password are required.", "error");
            return;
        }

        if (payload.password !== payload.confirmPassword) {
            showFeedback(registerFeedback, "Passwords must match.", "error");
            return;
        }

        try {
            const user = await request("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    username: payload.username,
                    password: payload.password,
                    role: payload.role
                })
            });

            setCurrentUser(user);
            redirectWithFlash("notes.html", `Account created as ${user.role}.`);
        } catch (error) {
            showFeedback(registerFeedback, error.message, "error");
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
    if (!requireAdminAccess()) {
        return;
    }

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
        const payload = {
            username: String(formData.get("username") || "").trim(),
            password: String(formData.get("password") || ""),
            confirmPassword: String(formData.get("confirmPassword") || ""),
            role: String(formData.get("role") || "Regular")
        };

        if (!payload.username || !payload.password) {
            showFeedback(feedback, "Username and password are required.", "error");
            return;
        }

        if (payload.password !== payload.confirmPassword) {
            showFeedback(feedback, "Passwords must match.", "error");
            return;
        }

        try {
            await request("/users", {
                method: "POST",
                body: JSON.stringify({
                    username: payload.username,
                    password: payload.password,
                    role: payload.role
                })
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
        redirectTo("notes.html");
        return;
    }

    if (!isAdmin() && !isSelf(userId)) {
        redirectTo("notes.html");
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
        const deleteSection = document.querySelector(".card--danger-state");

        editLink.href = `user-edit.html?id=${user.id}`;

        if (!isAdmin()) {
            deleteButton.hidden = true;
            deleteSection.hidden = true;
            return;
        }

        deleteButton.addEventListener("click", async () => {
            if (!askForConfirmation(`Delete user "${user.username}" and all of their notes?`)) {
                return;
            }

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
        redirectTo("notes.html");
        return;
    }

    if (!isAdmin() && !isSelf(userId)) {
        redirectTo("notes.html");
        return;
    }

    const roleField = document.querySelector("#edit-role");
    const roleGroup = roleField ? roleField.closest(".form__group") : null;

    if (!isAdmin() && roleGroup) {
        roleGroup.hidden = true;
    }

    try {
        const user = await request(`/users/${userId}`);
        form.elements.username.value = user.username;
        form.elements.role.value = user.role;
    } catch (error) {
        showFeedback(feedback, error.message, "error");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const username = String(formData.get("username") || "").trim();
        const password = String(formData.get("password") || "");
        const confirmPassword = String(formData.get("confirmPassword") || "");

        if (!username) {
            showFeedback(feedback, "Username is required.", "error");
            return;
        }

        if (password && password !== confirmPassword) {
            showFeedback(feedback, "Passwords must match.", "error");
            return;
        }

        try {
            const payload = {
                username,
                role: String(formData.get("role") || "Regular")
            };

            if (password) {
                payload.password = password;
            }

            const updatedUser = await request(`/users/${userId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            if (isSelf(userId)) {
                setCurrentUser(updatedUser);
            }

            reloadWithFlash("User updated successfully.");
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
            (note, index) => {
                const editable = canManageNote(note);

                return `
                    <article class="note-item${index === 0 ? " note-item--active" : ""}" data-note-id="${note.id}">
                        <div class="note-item__top">
                            <h3 class="item-title">${note.title}</h3>
                            <span class="badge">${note.username || "Unknown owner"}</span>
                        </div>
                        <p class="item-text">${note.content}</p>
                        <div class="actions actions--small">
                            <a class="button button--secondary" href="note-details.html?id=${note.id}">View</a>
                            ${editable ? `<a class="button button--secondary" href="note-edit.html?id=${note.id}">Edit</a>` : ""}
                        </div>
                    </article>
                `;
            }
        )
        .join("");
}

function setActiveNoteCard(noteId) {
    document.querySelectorAll("#notes-list .note-item").forEach((item) => {
        item.classList.toggle("note-item--active", Number(item.dataset.noteId) === Number(noteId));
    });
}

function placePreviewNextToNote(noteId) {
    const previewCard = document.querySelector("#notes-preview-card");
    const notesList = document.querySelector("#notes-list");
    const notesSection = notesList ? notesList.closest(".card") : null;

    if (!previewCard || !notesList || !notesSection) {
        return;
    }

    const targetNote = notesList.querySelector(`[data-note-id="${noteId}"]`);

    if (!targetNote) {
        previewCard.style.marginTop = "0px";
        return;
    }

    if (window.innerWidth <= 1000) {
        previewCard.style.marginTop = "0px";
        return;
    }

    const sectionRect = notesSection.getBoundingClientRect();
    const targetRect = targetNote.getBoundingClientRect();
    const maxOffset = Math.max(0, notesSection.offsetHeight - previewCard.offsetHeight);
    const desiredOffset = Math.max(0, Math.round(targetRect.top - sectionRect.top));
    const clampedOffset = Math.min(desiredOffset, maxOffset);

    previewCard.style.marginTop = `${clampedOffset}px`;
}

function renderPreview(note) {
    const editable = canManageNote(note);

    document.querySelector("#preview-note-title").textContent = note.title;
    document.querySelector("#preview-owner").textContent = note.username || "Unknown owner";
    document.querySelector("#preview-tags").textContent = formatTags(note.tags);
    document.querySelector("#preview-updated").textContent = formatDate(note.updated_at);
    document.querySelector("#preview-content").textContent = note.content;
    document.querySelector("#preview-open").href = `note-details.html?id=${note.id}`;

    const editLink = document.querySelector("#preview-edit");
    const deleteButton = document.querySelector("#preview-delete");

    editLink.href = `note-edit.html?id=${note.id}`;
    editLink.hidden = !editable;
    deleteButton.hidden = !editable;
    deleteButton.dataset.noteId = String(note.id);
    deleteButton.dataset.noteTitle = note.title;
    placePreviewNextToNote(note.id);
}

async function initNotesPage() {
    const feedback = document.querySelector("#notes-feedback");
    const currentUser = getCurrentUser();

    try {
        const notes = await loadNotes(isAdmin(currentUser) ? null : currentUser.id);
        renderNotesList(notes);

        if (notes[0]) {
            document.querySelector("#notes-preview-card").hidden = false;
            renderPreview(notes[0]);
            setActiveNoteCard(notes[0].id);
        } else {
            document.querySelector("#notes-preview-card").hidden = true;
            document.querySelector("#preview-edit").hidden = true;
            document.querySelector("#preview-delete").hidden = true;
        }

        document.querySelectorAll("#notes-list .note-item").forEach((item) => {
            item.addEventListener("click", (event) => {
                if (event.target.closest("a, button")) {
                    return;
                }

                const selectedNote = notes.find(
                    (note) => Number(note.id) === Number(item.dataset.noteId)
                );

                if (!selectedNote) {
                    return;
                }

                renderPreview(selectedNote);
                setActiveNoteCard(selectedNote.id);
            });
        });

        window.addEventListener("resize", () => {
            const activeNote = notes.find((note) => {
                const activeItem = document.querySelector("#notes-list .note-item--active");
                return activeItem && Number(note.id) === Number(activeItem.dataset.noteId);
            });

            if (activeNote) {
                placePreviewNextToNote(activeNote.id);
            }
        });

        const deleteButton = document.querySelector("#preview-delete");
        deleteButton.addEventListener("click", async () => {
            const noteId = deleteButton.dataset.noteId;
            const noteTitle = deleteButton.dataset.noteTitle || "this note";

            if (!noteId) {
                return;
            }

            if (!askForConfirmation(`Delete "${noteTitle}"?`)) {
                return;
            }

            try {
                await request(`/notes/${noteId}`, { method: "DELETE" });
                reloadWithFlash("Note deleted successfully.");
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
        redirectTo("notes.html");
        return;
    }

    try {
        const note = await request(`/notes/${noteId}`);
        const editable = canManageNote(note);

        document.querySelector("#note-details-title").textContent = note.title;
        document.querySelector("#note-owner").textContent = note.username || "Unknown owner";
        document.querySelector("#note-tags").textContent = formatTags(note.tags);
        document.querySelector("#note-updated").textContent = formatDate(note.updated_at);
        document.querySelector("#note-content").textContent = note.content;

        const editLink = document.querySelector("#edit-note-link");
        const deleteButton = document.querySelector("#delete-note-button");

        editLink.href = `note-edit.html?id=${note.id}`;
        editLink.hidden = !editable;
        deleteButton.hidden = !editable;

        if (!editable) {
            showFeedback(feedback, "You can view this note, but only the owner or an admin can edit it.", "error");
        }

        deleteButton.addEventListener("click", async () => {
            if (!askForConfirmation(`Delete "${note.title}"?`)) {
                return;
            }

            try {
                await request(`/notes/${note.id}`, { method: "DELETE" });
                redirectWithFlash("notes.html", "Note deleted successfully.");
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

    const currentUser = getCurrentUser();
    const ownerSelect = form.elements.userId;
    const ownerGroup = ownerSelect.closest(".form__group");

    try {
        if (isAdmin(currentUser)) {
            const users = await loadUsers();
            populateOwnerSelect(ownerSelect, users, currentUser.id);
        } else {
            ownerSelect.innerHTML = `<option value="${currentUser.id}">${currentUser.username}</option>`;
            ownerSelect.value = String(currentUser.id);
            disableElement(ownerSelect, true);
        }
    } catch (error) {
        showFeedback(feedback, error.message, "error");
        return;
    }

    if (!isAdmin(currentUser)) {
        ownerGroup.hidden = true;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const payload = {
            title: String(formData.get("title") || "").trim(),
            content: String(formData.get("content") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            user_id: Number(isAdmin(currentUser) ? formData.get("userId") : currentUser.id)
        };

        if (!payload.title || !payload.content) {
            showFeedback(feedback, "Title and content are required.", "error");
            return;
        }

        try {
            const note = await request("/notes", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            redirectWithFlash("note-details.html", "Note created successfully.", note.id);
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
        redirectTo("notes.html");
        return;
    }

    const currentUser = getCurrentUser();
    const ownerSelect = form.elements.userId;
    const ownerGroup = ownerSelect.closest(".form__group");

    try {
        const note = await request(`/notes/${noteId}`);

        if (!canManageNote(note)) {
            showFeedback(feedback, "Only the note owner or an admin can edit this note.", "error");
            Array.from(form.elements).forEach((element) => disableElement(element, true));
            return;
        }

        if (isAdmin(currentUser)) {
            const users = await loadUsers();
            populateOwnerSelect(ownerSelect, users, note.user_id);
        } else {
            ownerSelect.innerHTML = `<option value="${note.user_id}">${note.username}</option>`;
            ownerSelect.value = String(note.user_id);
            disableElement(ownerSelect, true);
            ownerGroup.hidden = true;
        }

        form.elements.title.value = note.title;
        form.elements.content.value = note.content;
        form.elements.tags.value = note.tags || "";
        document.querySelector("#note-last-updated").textContent = formatDate(note.updated_at);
    } catch (error) {
        showFeedback(feedback, error.message, "error");
        Array.from(form.elements).forEach((element) => disableElement(element, true));
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        hideFeedback(feedback);

        const formData = new FormData(form);
        const payload = {
            title: String(formData.get("title") || "").trim(),
            content: String(formData.get("content") || "").trim(),
            tags: String(formData.get("tags") || "").trim(),
            user_id: Number(isAdmin(currentUser) ? formData.get("userId") : currentUser.id)
        };

        if (!payload.title || !payload.content) {
            showFeedback(feedback, "Title and content are required.", "error");
            return;
        }

        try {
            await request(`/notes/${noteId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            redirectWithFlash("note-details.html", "Note updated successfully.", noteId);
        } catch (error) {
            showFeedback(feedback, error.message, "error");
        }
    });
}

async function initPage() {
    updateNavigation();
    wireLogoutLinks();

    const pageName = getPageName();

    if (pageName !== "login.html" && !requireLogin()) {
        return;
    }

    showStoredFlashMessage();

    if (pageName === "login.html") {
        await initLoginPage();
        return;
    }

    if (pageName === "register.html") {
        await initRegisterPage();
        return;
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

initPage().catch(() => {});

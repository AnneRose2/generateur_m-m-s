const canvas = document.getElementById("memeCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.getElementById("imageInput");
const topTextInput = document.getElementById("topText");
const bottomTextInput = document.getElementById("bottomText");
const fontSizeInput = document.getElementById("fontSize");
const textColorInput = document.getElementById("textColor");
const outlineColorInput = document.getElementById("outlineColor");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusMessage = document.getElementById("statusMessage");
const galleryGrid = document.getElementById("galleryGrid");
const galleryTemplate = document.getElementById("galleryItemTemplate");
const clearGalleryBtn = document.getElementById("clearGalleryBtn");

const state = {
    baseImage: null,
    baseImageUrl: "",
    topText: "",
    bottomText: "",
    fontSize: parseInt(fontSizeInput.value, 10),
    textColor: textColorInput.value,
    outlineColor: outlineColorInput.value
};

const GALLERY_KEY = "meme-generator-gallery";
const MAX_CANVAS_SIZE = 800;

function updateStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message${type ? ` ${type}` : ""}`;
}

function enableActions(enabled) {
    downloadBtn.disabled = !enabled;
    shareBtn.disabled = !enabled;
    saveBtn.disabled = !enabled;
}

function scaleDimensions({ width, height }) {
    if (width <= MAX_CANVAS_SIZE && height <= MAX_CANVAS_SIZE) {
        return { width, height };
    }
    const ratio = Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio)
    };
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTextLine(text, yPosition) {
    const fontSize = state.fontSize;
    ctx.font = `${fontSize}px Impact, "Anton", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = state.textColor;
    ctx.strokeStyle = state.outlineColor;
    ctx.lineWidth = Math.max(fontSize * 0.08, 2);
    ctx.lineJoin = "round";
    ctx.strokeText(text, canvas.width / 2, yPosition);
    ctx.fillText(text, canvas.width / 2, yPosition);
}

function renderMeme() {
    clearCanvas();
    if (!state.baseImage) {
        enableActions(false);
        return;
    }

    ctx.drawImage(state.baseImage, 0, 0, canvas.width, canvas.height);

    ctx.textBaseline = "top";
    if (state.topText.trim()) {
        drawTextLine(state.topText.toUpperCase(), state.fontSize * 0.2);
    }

    ctx.textBaseline = "bottom";
    if (state.bottomText.trim()) {
        drawTextLine(state.bottomText.toUpperCase(), canvas.height - state.fontSize * 0.2);
    }

    enableActions(true);
}

async function loadBaseImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
    });
}

async function handleImageUpload(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const dataUrl = event.target.result;
            const image = await loadBaseImage(dataUrl);
            const { width, height } = scaleDimensions(image);
            canvas.width = width;
            canvas.height = height;
            state.baseImage = image;
            state.baseImageUrl = dataUrl;
            state.topText = topTextInput.value;
            state.bottomText = bottomTextInput.value;
            renderMeme();
            updateStatus("Image chargée. Ajoutez votre texte.", "success");
        } catch (error) {
            console.error(error);
            updateStatus("Impossible de charger cette image.", "error");
        }
    };
    reader.readAsDataURL(file);
}

function handleTextUpdate() {
    state.topText = topTextInput.value;
    state.bottomText = bottomTextInput.value;
    renderMeme();
}

function handleStyleUpdate() {
    state.fontSize = parseInt(fontSizeInput.value, 10);
    state.textColor = textColorInput.value;
    state.outlineColor = outlineColorInput.value;
    renderMeme();
}

function downloadMeme() {
    canvas.toBlob((blob) => {
        if (!blob) {
            updateStatus("Téléchargement indisponible.", "error");
            return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "meme.png";
        link.click();
        URL.revokeObjectURL(url);
        updateStatus("Mème téléchargé.", "success");
    });
}

async function shareMeme() {
    if (!navigator.share || !navigator.canShare) {
        copyMemeToClipboard();
        return;
    }

    canvas.toBlob(async (blob) => {
        if (!blob) {
            updateStatus("Partage indisponible.", "error");
            return;
        }
        try {
            const file = new File([blob], "meme.png", { type: "image/png" });
            if (!navigator.canShare({ files: [file] })) {
                copyMemeToClipboard();
                return;
            }
            await navigator.share({
                files: [file],
                title: "Mon mème",
                text: "Découvrez mon nouveau mème !"
            });
            updateStatus("Mème partagé.", "success");
        } catch (error) {
            console.error(error);
            updateStatus("Partage interrompu.", "error");
        }
    });
}

function copyMemeToClipboard() {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        updateStatus("Partage non supporté, utilisez le téléchargement.", "error");
        return;
    }
    canvas.toBlob(async (blob) => {
        if (!blob) {
            updateStatus("Copie impossible.", "error");
            return;
        }
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob })
            ]);
            updateStatus("Mème copié dans le presse-papiers.", "success");
        } catch (error) {
            console.error(error);
            updateStatus("Partage non supporté, fichier prêt au téléchargement.", "error");
        }
    });
}

function saveToGallery() {
    const dataUrl = canvas.toDataURL("image/png");
    const gallery = loadGallery();
    gallery.unshift({ id: crypto.randomUUID(), dataUrl, createdAt: Date.now() });
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery.slice(0, 20)));
    populateGallery();
    updateStatus("Mème ajouté à la galerie.", "success");
}

function loadGallery() {
    try {
        return JSON.parse(localStorage.getItem(GALLERY_KEY)) ?? [];
    } catch (_error) {
        return [];
    }
}

function populateGallery() {
    const gallery = loadGallery();
    galleryGrid.innerHTML = "";

    if (gallery.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Aucun mème sauvegardé pour le moment.";
        empty.className = "helper-text";
        galleryGrid.appendChild(empty);
        return;
    }

    gallery.forEach((item) => {
        const fragment = galleryTemplate.content.cloneNode(true);
        const figure = fragment.querySelector(".gallery-item");
        const img = fragment.querySelector("img");
        const reuseButton = fragment.querySelector(".use-meme");
        const downloadButton = fragment.querySelector(".download-meme");

        img.src = item.dataUrl;
        img.alt = "Mème sauvegardé";
        reuseButton.dataset.id = item.id;
        downloadButton.dataset.id = item.id;

        figure.dataset.id = item.id;
        galleryGrid.appendChild(fragment);
    });
}

function reuseMeme(id) {
    const gallery = loadGallery();
    const meme = gallery.find((item) => item.id === id);
    if (!meme) {
        updateStatus("Mème introuvable.", "error");
        return;
    }

    loadBaseImage(meme.dataUrl)
        .then((image) => {
            const { width, height } = scaleDimensions(image);
            canvas.width = width;
            canvas.height = height;
            state.baseImage = image;
            state.baseImageUrl = meme.dataUrl;
            topTextInput.value = "";
            bottomTextInput.value = "";
            handleTextUpdate();
            updateStatus("Mème chargé depuis la galerie.", "success");
        })
        .catch((error) => {
            console.error(error);
            updateStatus("Impossible de réutiliser ce mème.", "error");
        });
}

function downloadFromGallery(id) {
    const gallery = loadGallery();
    const meme = gallery.find((item) => item.id === id);
    if (!meme) {
        updateStatus("Mème introuvable.", "error");
        return;
    }
    const link = document.createElement("a");
    link.href = meme.dataUrl;
    link.download = "meme.png";
    link.click();
    updateStatus("Téléchargement lancé.", "success");
}

function clearGallery() {
    localStorage.removeItem(GALLERY_KEY);
    populateGallery();
    updateStatus("Galerie vidée.", "success");
}

function resetEditor() {
    state.baseImage = null;
    state.baseImageUrl = "";
    topTextInput.value = "";
    bottomTextInput.value = "";
    fontSizeInput.value = "36";
    textColorInput.value = "#ffffff";
    outlineColorInput.value = "#000000";
    handleStyleUpdate();
    enableActions(false);
    updateStatus("Éditeur réinitialisé.");
    clearCanvas();
}

imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    handleImageUpload(file);
});

topTextInput.addEventListener("input", handleTextUpdate);
bottomTextInput.addEventListener("input", handleTextUpdate);
fontSizeInput.addEventListener("input", handleStyleUpdate);
textColorInput.addEventListener("input", handleStyleUpdate);
outlineColorInput.addEventListener("input", handleStyleUpdate);

downloadBtn.addEventListener("click", downloadMeme);
shareBtn.addEventListener("click", shareMeme);
saveBtn.addEventListener("click", saveToGallery);
resetBtn.addEventListener("click", resetEditor);
clearGalleryBtn.addEventListener("click", clearGallery);

galleryGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("use-meme")) {
        reuseMeme(target.dataset.id);
    } else if (target.classList.contains("download-meme")) {
        downloadFromGallery(target.dataset.id);
    }
});

// Restore previous session state if possible
(function restoreSession() {
    if (!state.baseImageUrl) {
        clearCanvas();
    }
    populateGallery();
})();

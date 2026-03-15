const bgMusic = document.getElementById("bgMusic");
const birthdaySong = document.getElementById("birthdaySong");
const candleButton = document.getElementById("candleButton");
const surpriseButton = document.getElementById("surpriseButton");
const cakeModal = document.getElementById("cakeModal");
const closeCakeModal = document.getElementById("closeCakeModal");
const cakeModalBackdrop = document.getElementById("cakeModalBackdrop");
const cakeScene = document.getElementById("cakeScene");
const videoModal = document.getElementById("videoModal");
const closeVideoModal = document.getElementById("closeVideoModal");
const videoModalBackdrop = document.getElementById("videoModalBackdrop");
const surpriseVideo = document.getElementById("surpriseVideo");
const particleLayer = document.getElementById("particleLayer");
const memePopLayer = document.getElementById("memePopLayer");
const loveRainLayer = document.getElementById("loveRainLayer");
const memoriesSection = document.getElementById("memories");
const endingSection = document.getElementById("ending");
const awardCertificate = document.querySelector(".award-certificate");

let currentMode = "bg";
let modeBeforeVideo = "bg";
let autoplayBlocked = false;
let lastSparkleTime = 0;
let confettiTimer = null;
let memeRainTimer = null;
let lastMemeIndex = -1;
let lastEndingBurstAt = 0;
let endingBurstActive = false;
let endingConfettiLoop = null;
let endingMegaTimeouts = [];
const activeMemeRects = [];

/*
    表情包替换位置：
    把下面的 src 路径换成你想用的表情包 / 搞笑贴纸图片
*/
const memeAssets = [
    { src: "assets/memes/meme1.png", text: "海燕女士一出场，页面自动进入花开富贵模式。" },
    { src: "assets/memes/meme2.png", text: "今天的寿星气质太旺，镜头都得先站稳。" },
    { src: "assets/memes/meme3.png", text: "快乐指数爆表，家庭群准备刷屏。" },
    { src: "assets/memes/meme4.png", text: "本贴纸认证：寿星 today very shining！" },
    { src: "assets/memes/meme5.png", text: "花开富贵特效组表示：今天必须加班发光。" },
    { src: "assets/memes/meme6.png", text: "张海燕女士生日当天，连好运都主动排队。" },
    { src: "assets/memes/meme7.png", text: "这不是普通网页，这是寿星专属排面现场。" },
    { src: "assets/memes/meme8.png", text: "镜头请注意，女主角情绪稳定且非常美丽。" }
];

const loveRainAssets = [
    { type: "text", value: "生日快乐" },
    { type: "text", value: "花开富贵" },
    { type: "text", value: "最佳寿星奖" },
    { type: "text", value: "海燕女士最旺" },
    { type: "img", value: "assets/memes/meme1.png", label: "爱心雨 1" },
    { type: "img", value: "assets/memes/meme2.png", label: "爱心雨 2" },
    { type: "img", value: "assets/memes/meme5.png", label: "爱心雨 3" },
    { type: "img", value: "assets/memes/meme6.png", label: "爱心雨 4" }
];

setupImageFallbacks();
setupRevealObserver();
setupAutoplay();
setupInteractions();
setupScrollMemes();
setupEndingObserver();

function setupAutoplay() {
    bgMusic.volume = 0.45;
    birthdaySong.volume = 0.8;
    bgMusic.autoplay = true;
    bgMusic.setAttribute("autoplay", "autoplay");

    attemptBackgroundAutoplay();

    ["DOMContentLoaded", "load", "pageshow"].forEach((eventName) => {
        window.addEventListener(eventName, attemptBackgroundAutoplay, { once: eventName !== "pageshow" });
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && currentMode === "bg") {
            attemptBackgroundAutoplay();
        }
    });

    const unlockAudio = async () => {
        if (!autoplayBlocked) {
            return;
        }

        autoplayBlocked = false;
        if (currentMode === "birthday") {
            await tryPlay(birthdaySong).catch(() => {});
            return;
        }

        if (currentMode === "video") {
            await surpriseVideo.play().catch(() => {});
            return;
        }

        await tryPlay(bgMusic).catch(() => {});
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
}

function attemptBackgroundAutoplay() {
    if (currentMode !== "bg") {
        return Promise.resolve();
    }

    return tryPlay(bgMusic)
        .then(() => {
            currentMode = "bg";
            autoplayBlocked = false;
        })
        .catch(() => {
            autoplayBlocked = true;
            showToast("背景音乐已经设置为自动播放；如果浏览器拦截，点一下页面就会响。");
        });
}

function setupInteractions() {
    candleButton.addEventListener("click", openCakeModalScene);
    surpriseButton.addEventListener("click", openVideoModal);

    closeCakeModal.addEventListener("click", closeCakeModalAndResume);
    cakeModalBackdrop.addEventListener("click", closeCakeModalAndResume);

    closeVideoModal.addEventListener("click", closeVideoModalAndResume);
    videoModalBackdrop.addEventListener("click", closeVideoModalAndResume);

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && videoModal.classList.contains("is-open")) {
            closeVideoModalAndResume();
            return;
        }

        if (event.key === "Escape" && cakeModal.classList.contains("is-open")) {
            closeCakeModalAndResume();
        }
    });

    surpriseVideo.addEventListener("ended", () => {
        showToast("视频播放完成，感动值和热闹值都加满了。");
    });
}

function setupRevealObserver() {
    const revealItems = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.14
        }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
}

function setupScrollMemes() {
    setupMemoriesMemeLoop();

    window.addEventListener("mousemove", (event) => {
        const now = Date.now();
        if (now - lastSparkleTime < 70) {
            return;
        }

        lastSparkleTime = now;
        createSparkle(event.clientX, event.clientY);
    });

    window.addEventListener(
        "touchmove",
        (event) => {
            const touch = event.touches[0];
            if (!touch) {
                return;
            }

            const now = Date.now();
            if (now - lastSparkleTime < 90) {
                return;
            }

            lastSparkleTime = now;
            createSparkle(touch.clientX, touch.clientY);
        },
        { passive: true }
    );
}

function setupMemoriesMemeLoop() {
    if (!memoriesSection) {
        return;
    }

    const startLoop = () => {
        if (memeRainTimer !== null) {
            return;
        }

        createMemePopup(getRandomMemeAsset());
        memeRainTimer = window.setInterval(() => {
            createMemePopup(getRandomMemeAsset());
        }, 900);
    };

    const stopLoop = () => {
        if (memeRainTimer === null) {
            return;
        }

        window.clearInterval(memeRainTimer);
        memeRainTimer = null;
    };

    const syncMemoriesLoop = () => {
        const rect = memoriesSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const isVisible = rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.18;

        if (isVisible) {
            startLoop();
            return;
        }

        stopLoop();
    };

    syncMemoriesLoop();
    window.addEventListener("scroll", syncMemoriesLoop, { passive: true });
    window.addEventListener("resize", syncMemoriesLoop);
    window.addEventListener("orientationchange", syncMemoriesLoop);
}

function setupEndingObserver() {
    const triggerEndingBurst = () => {
        const now = Date.now();
        if (now - lastEndingBurstAt < 2600) {
            return;
        }

        lastEndingBurstAt = now;
        startEndingMegaBurst();
    };

    const endingObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !endingBurstActive) {
                    endingBurstActive = true;
                    triggerEndingBurst();
                    return;
                }

                if (!entry.isIntersecting) {
                    endingBurstActive = false;
                }
            });
        },
        {
            threshold: 0.55
        }
    );

    endingObserver.observe(endingSection);

    window.addEventListener("scroll", () => {
        const scrollBottom = window.scrollY + window.innerHeight;
        const pageHeight = document.documentElement.scrollHeight;
        const nearBottom = pageHeight - scrollBottom < 80;

        if (nearBottom && !endingBurstActive) {
            endingBurstActive = true;
            triggerEndingBurst();
            return;
        }

        if (!nearBottom && scrollBottom < pageHeight - 180) {
            endingBurstActive = false;
        }
    });
}

function setupImageFallbacks() {
    const imageNodes = document.querySelectorAll("img[data-fallback-label]");

    imageNodes.forEach((image) => {
        image.addEventListener("error", () => {
            image.src = createPlaceholderImage(image.dataset.fallbackLabel || "图片待替换");
        });
    });
}

function stopAllAudio() {
    bgMusic.pause();
    birthdaySong.pause();
    surpriseVideo.pause();
}

function activateBackgroundMode() {
    stopAllAudio();
    currentMode = "bg";
    birthdaySong.currentTime = 0;
    syncBodyModalState();

    tryPlay(bgMusic).catch(() => {
        autoplayBlocked = true;
        showToast("点一下页面，继续播放背景音乐。");
    });
}

async function openCakeModalScene() {
    modeBeforeVideo = "bg";
    closeVideoModalOnly();
    stopAllAudio();
    currentMode = "birthday";
    cakeModal.classList.add("is-open");
    cakeModal.setAttribute("aria-hidden", "false");
    cakeScene.classList.add("is-active");
    syncBodyModalState();

    birthdaySong.currentTime = 0;
    await tryPlay(birthdaySong).catch(() => {
        autoplayBlocked = true;
        showToast("生日歌准备好了，点一下页面继续播放。");
    });

    burstConfetti(28);
    launchTemporaryConfetti();
}

function closeCakeModalAndResume() {
    cakeScene.classList.remove("is-active");
    cakeModal.classList.remove("is-open");
    cakeModal.setAttribute("aria-hidden", "true");
    birthdaySong.pause();
    birthdaySong.currentTime = 0;
    activateBackgroundMode();
}

async function openVideoModal() {
    modeBeforeVideo = currentMode;

    if (cakeModal.classList.contains("is-open")) {
        closeCakeModalOnly();
    }

    stopAllAudio();
    currentMode = "video";
    videoModal.classList.add("is-open");
    videoModal.setAttribute("aria-hidden", "false");
    syncBodyModalState();

    try {
        await surpriseVideo.play();
    } catch (error) {
        showToast("视频已经打开，如果没自动播放，点一下播放键就行。");
    }
}

function closeVideoModalAndResume() {
    closeVideoModalOnly();

    if (modeBeforeVideo === "birthday") {
        reopenCakeModalScene();
        return;
    }

    activateBackgroundMode();
}

function closeCakeModalOnly() {
    cakeScene.classList.remove("is-active");
    cakeModal.classList.remove("is-open");
    cakeModal.setAttribute("aria-hidden", "true");
    birthdaySong.pause();
    birthdaySong.currentTime = 0;
    syncBodyModalState();
}

function closeVideoModalOnly() {
    videoModal.classList.remove("is-open");
    videoModal.setAttribute("aria-hidden", "true");
    surpriseVideo.pause();
    syncBodyModalState();
}

function reopenCakeModalScene() {
    currentMode = "birthday";
    cakeModal.classList.add("is-open");
    cakeModal.setAttribute("aria-hidden", "false");
    cakeScene.classList.add("is-active");
    syncBodyModalState();

    tryPlay(birthdaySong).catch(() => {
        autoplayBlocked = true;
    });
}

function syncBodyModalState() {
    const modalOpen =
        cakeModal.classList.contains("is-open") || videoModal.classList.contains("is-open");

    document.body.classList.toggle("modal-open", modalOpen);
}

function createSparkle(x, y) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${x - 7}px`;
    sparkle.style.top = `${y - 7}px`;
    particleLayer.appendChild(sparkle);

    window.setTimeout(() => {
        sparkle.remove();
    }, 900);
}

function createMemePopup(item) {
    const popup = document.createElement("div");
    const image = document.createElement("img");
    const popupRect = getNonOverlappingMemeRect();

    popup.className = "meme-pop";
    popup.style.left = `${popupRect.left}px`;
    popup.style.top = `${popupRect.top}px`;
    popup.style.width = `${popupRect.size}px`;

    image.src = item.src;
    image.alt = "搞笑贴纸";
    image.addEventListener("error", () => {
        image.src = createPlaceholderImage("表情包待替换");
    });

    popup.appendChild(image);
    memePopLayer.appendChild(popup);
    activeMemeRects.push(popupRect);

    window.setTimeout(() => {
        popup.remove();
        const rectIndex = activeMemeRects.indexOf(popupRect);
        if (rectIndex >= 0) {
            activeMemeRects.splice(rectIndex, 1);
        }
    }, 3600);
}

function getRandomMemeAsset() {
    if (memeAssets.length === 1) {
        return memeAssets[0];
    }

    let nextIndex = Math.floor(Math.random() * memeAssets.length);

    while (nextIndex === lastMemeIndex) {
        nextIndex = Math.floor(Math.random() * memeAssets.length);
    }

    lastMemeIndex = nextIndex;
    return memeAssets[nextIndex];
}

function getNonOverlappingMemeRect() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxSize = Math.min(190, Math.max(110, viewportWidth * 0.18));
    const minSize = Math.min(140, Math.max(88, viewportWidth * 0.12));

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const size = Math.round(minSize + Math.random() * (maxSize - minSize));
        const left = Math.round(12 + Math.random() * Math.max(20, viewportWidth - size - 24));
        const top = Math.round(20 + Math.random() * Math.max(40, viewportHeight - size - 40));
        const candidate = { left, top, size };

        const overlaps = activeMemeRects.some((rect) => isMemeRectOverlapping(candidate, rect));
        if (!overlaps) {
            return candidate;
        }
    }

    const size = Math.round(minSize + Math.random() * (maxSize - minSize));
    return {
        left: Math.round(12 + Math.random() * Math.max(20, viewportWidth - size - 24)),
        top: Math.round(20 + Math.random() * Math.max(40, viewportHeight - size - 40)),
        size
    };
}

function isMemeRectOverlapping(a, b) {
    const padding = 22;

    return !(
        a.left + a.size + padding < b.left ||
        b.left + b.size + padding < a.left ||
        a.top + a.size + padding < b.top ||
        b.top + b.size + padding < a.top
    );
}

function launchTemporaryConfetti() {
    clearInterval(confettiTimer);
    let rounds = 0;

    confettiTimer = window.setInterval(() => {
        burstConfetti(14);
        rounds += 1;

        if (rounds >= 5) {
            clearInterval(confettiTimer);
        }
    }, 500);
}

function burstConfetti(amount, options = {}) {
    const {
        topMin = 18,
        topRange = 22,
        leftMin = 16,
        leftRange = 68,
        durationMin = 1.2,
        durationRange = 0.8,
        lifeMs = 1800,
        palette = ["#ffd76f", "#ff77a9", "#82c96b"]
    } = options;

    for (let index = 0; index < amount; index += 1) {
        const piece = document.createElement("span");
        const size = 8 + Math.random() * 10;
        const characters = ["★", "♥", "✦", "✧"];

        piece.className = "love-rain-item text";
        piece.textContent = characters[Math.floor(Math.random() * characters.length)];
        piece.style.left = `${leftMin + Math.random() * leftRange}%`;
        piece.style.top = `${topMin + Math.random() * topRange}%`;
        piece.style.fontSize = `${size * 1.5}px`;
        piece.style.color = palette[Math.floor(Math.random() * palette.length)];
        piece.style.animationDuration = `${durationMin + Math.random() * durationRange}s`;

        loveRainLayer.appendChild(piece);
        window.setTimeout(() => {
            piece.remove();
        }, lifeMs);
    }
}

function startLoveRain(options = {}) {
    const {
        totalItems = 28,
        interval = 170,
        durationMin = 4.8,
        durationRange = 2,
        imageSize = null
    } = options;

    for (let index = 0; index < totalItems; index += 1) {
        const timeoutId = window.setTimeout(() => {
            createLoveRainItem(loveRainAssets[index % loveRainAssets.length], {
                durationMin,
                durationRange,
                imageSize
            });
        }, index * interval);
        endingMegaTimeouts.push(timeoutId);
    }
}

function createLoveRainItem(item, options = {}) {
    const {
        durationMin = 4.8,
        durationRange = 2,
        imageSize = null
    } = options;
    const rainItem = document.createElement("div");
    rainItem.className = `love-rain-item ${item.type}`;
    rainItem.style.left = `${Math.random() * 92}%`;
    rainItem.style.animationDuration = `${durationMin + Math.random() * durationRange}s`;

    if (item.type === "img") {
        const image = document.createElement("img");
        image.src = item.value;
        image.alt = item.label;
        if (imageSize) {
            image.style.width = `${imageSize}px`;
            image.style.height = `${imageSize}px`;
        }
        image.addEventListener("error", () => {
            image.src = createPlaceholderImage(item.label);
        });
        rainItem.appendChild(image);
    } else {
        rainItem.textContent = item.value;
    }

    loveRainLayer.appendChild(rainItem);

    window.setTimeout(() => {
        rainItem.remove();
    }, (durationMin + durationRange + 0.6) * 1000);
}

function startEndingMegaBurst() {
    clearEndingMegaBurst();

    if (awardCertificate) {
        awardCertificate.classList.remove("is-burst");
        void awardCertificate.offsetWidth;
        awardCertificate.classList.add("is-burst");
        const timeoutId = window.setTimeout(() => {
            awardCertificate.classList.remove("is-burst");
        }, 5600);
        endingMegaTimeouts.push(timeoutId);
    }

    startLoveRain({
        totalItems: 72,
        interval: 90,
        durationMin: 5.8,
        durationRange: 3.2,
        imageSize: 92
    });

    for (let index = 0; index < 22; index += 1) {
        const timeoutId = window.setTimeout(() => {
            createEndingMemeBurstItem();
        }, index * 180);
        endingMegaTimeouts.push(timeoutId);
    }

    burstConfetti(42, {
        topMin: 8,
        topRange: 28,
        leftMin: 4,
        leftRange: 92,
        durationMin: 1.8,
        durationRange: 1.2,
        lifeMs: 2800,
        palette: ["#ffd76f", "#ffb000", "#fff2a6", "#ff77a9"]
    });

    endingConfettiLoop = window.setInterval(() => {
        burstConfetti(26, {
            topMin: 10,
            topRange: 26,
            leftMin: 4,
            leftRange: 92,
            durationMin: 1.8,
            durationRange: 1.4,
            lifeMs: 2800,
            palette: ["#ffd76f", "#ffcf59", "#fff2a6", "#ff9ec4"]
        });
    }, 700);

    const stopLoopId = window.setTimeout(() => {
        window.clearInterval(endingConfettiLoop);
        endingConfettiLoop = null;
    }, 5600);
    endingMegaTimeouts.push(stopLoopId);
}

function clearEndingMegaBurst() {
    if (endingConfettiLoop) {
        window.clearInterval(endingConfettiLoop);
        endingConfettiLoop = null;
    }

    endingMegaTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
    });
    endingMegaTimeouts = [];
}

function createEndingMemeBurstItem() {
    const rainItem = document.createElement("div");
    const image = document.createElement("img");
    const asset = getRandomMemeAsset();
    const size = Math.round(82 + Math.random() * 42);

    rainItem.className = "love-rain-item img";
    rainItem.style.left = `${Math.random() * 90}%`;
    rainItem.style.animationDuration = `${5.8 + Math.random() * 2.6}s`;

    image.src = asset.src;
    image.alt = "底部表情包雨";
    image.style.width = `${size}px`;
    image.style.height = `${size}px`;
    image.addEventListener("error", () => {
        image.src = createPlaceholderImage("表情包待替换");
    });

    rainItem.appendChild(image);
    loveRainLayer.appendChild(rainItem);

    window.setTimeout(() => {
        rainItem.remove();
    }, 9000);
}

function showToast(message) {
    let toast = document.querySelector(".toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");

    window.clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2200);
}

function tryPlay(mediaElement) {
    return mediaElement.play();
}

function createPlaceholderImage(label) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ffd76f" />
                    <stop offset="55%" stop-color="#ff8ab7" />
                    <stop offset="100%" stop-color="#8dc56f" />
                </linearGradient>
            </defs>
            <rect width="800" height="600" rx="36" fill="url(#g)" />
            <g fill="#fff8dd" font-family="Microsoft YaHei, PingFang SC, sans-serif" text-anchor="middle">
                <text x="400" y="255" font-size="44">素材待替换</text>
                <text x="400" y="330" font-size="34">${label}</text>
                <text x="400" y="400" font-size="28">把路径换成你自己的照片或表情包</text>
            </g>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* ============================================================
   企业家AI转型私董会暨实训营 · 官网交互脚本
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 顶部导航：滚动高亮与底色 ---------- */
  var header = document.getElementById("siteHeader");
  var onScroll = function () {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", function () {
    var open = mainNav.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });
  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      mainNav.classList.remove("open");
      navToggle.classList.remove("open");
    });
  });

  /* ---------- 滚动显现动画 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- 照片墙：懒加载渲染 ---------- */
  var galleryGrid = document.getElementById("galleryGrid");
  var photos = (typeof GALLERY_PHOTOS !== "undefined") ? GALLERY_PHOTOS : [];
  var galleryImgs = []; // 供灯箱按顺序浏览

  if (galleryGrid && photos.length) {
    var loadLimit = 24;   // 首屏先加载的张数
    var loadedCount = 0;

    photos.forEach(function (file, i) {
      var item = document.createElement("figure");
      item.className = "gallery-item";
      var img = document.createElement("img");
      img.alt = "实训营纪实照片 " + (i + 1);
      img.dataset.src = "img/photos/" + file;
      img.dataset.index = i;
      item.appendChild(img);
      galleryGrid.appendChild(item);
      galleryImgs.push(img);
    });

    // 真正加载某张图
    var loadImg = function (img) {
      if (img.src || img.dataset.loading) { return; }
      img.dataset.loading = "1";
      img.src = img.dataset.src;
      img.addEventListener("load", function () {
        img.classList.add("loaded");
        img.removeAttribute("data-loading");
      });
      img.addEventListener("error", function () {
        img.closest(".gallery-item").remove();
      });
    };

    // 初始加载前 N 张
    for (var k = 0; k < Math.min(loadLimit, galleryImgs.length); k++) {
      loadImg(galleryImgs[k]);
    }
    loadedCount = Math.min(loadLimit, galleryImgs.length);

    // 滚动到接近底部时，继续追加加载
    var loadMore = function () {
      var scrollBottom = window.scrollY + window.innerHeight;
      var docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 1200 && loadedCount < galleryImgs.length) {
        var target = loadedCount + 24;
        for (; loadedCount < target && loadedCount < galleryImgs.length; loadedCount++) {
          loadImg(galleryImgs[loadedCount]);
        }
      }
    };
    window.addEventListener("scroll", loadMore, { passive: true });
    window.addEventListener("resize", loadMore, { passive: true });

    /* ---------- 灯箱 ---------- */
    var lightbox = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbCounter = document.getElementById("lbCounter");
    var currentIndex = 0;

    var showLb = function (index) {
      currentIndex = (index + galleryImgs.length) % galleryImgs.length;
      var img = galleryImgs[currentIndex];
      loadImg(img);
      lbImg.src = img.dataset.src;
      lbCounter.textContent = (currentIndex + 1) + " / " + galleryImgs.length;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    };
    var closeLb = function () {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      lbImg.src = "";
    };

    galleryGrid.addEventListener("click", function (e) {
      var img = e.target.closest ? e.target.closest(".gallery-item img") : null;
      if (img) { showLb(parseInt(img.dataset.index, 10)); }
    });
    document.getElementById("lbClose").addEventListener("click", closeLb);
    document.getElementById("lbPrev").addEventListener("click", function () { showLb(currentIndex - 1); });
    document.getElementById("lbNext").addEventListener("click", function () { showLb(currentIndex + 1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) { closeLb(); }
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) { return; }
      if (e.key === "Escape") { closeLb(); }
      if (e.key === "ArrowLeft") { showLb(currentIndex - 1); }
      if (e.key === "ArrowRight") { showLb(currentIndex + 1); }
    });
  }

  /* ---------- 参营企业：点击企业名播放对应视频 ---------- */
  var videoModal = document.getElementById("videoModal");
  var vmVideo = document.getElementById("vmVideo");
  var vmTitle = document.getElementById("vmTitle");
  var vmEmpty = document.getElementById("vmEmpty");
  var vmEmptyDesc = document.getElementById("vmEmptyDesc");
  var tags = document.querySelectorAll(".company-tag[data-video]");

  if (videoModal && vmVideo && tags.length) {
    var lastTrigger = null;

    var showEmpty = function (src) {
      vmVideo.hidden = true;
      vmEmpty.hidden = false;
      vmEmptyDesc.textContent = "视频文件尚未就位：" + src;
    };

    var openVideo = function (trigger) {
      var src = trigger.getAttribute("data-video");
      var name = trigger.getAttribute("data-company") || trigger.textContent.trim();

      lastTrigger = trigger;
      vmTitle.textContent = name;
      vmEmpty.hidden = true;
      vmVideo.hidden = false;

      // 每次重新指向源，避免残留上一条视频的画面与播放状态
      vmVideo.pause();
      vmVideo.removeAttribute("src");
      vmVideo.setAttribute("src", src);
      vmVideo.load();

      // 文件缺失时给出可读的占位提示，而不是一个黑框
      vmVideo.onerror = function () { showEmpty(src); };
      var attempt = vmVideo.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(function () { /* 自动播放被拦截时，交给用户点播放键 */ });
      }

      videoModal.classList.add("open");
      videoModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      document.getElementById("vmClose").focus();
    };

    var closeVideo = function () {
      videoModal.classList.remove("open");
      videoModal.setAttribute("aria-hidden", "true");
      vmVideo.pause();
      vmVideo.removeAttribute("src");
      vmVideo.load();
      vmVideo.onerror = null;
      document.body.style.overflow = "";
      if (lastTrigger) { lastTrigger.focus(); }
    };

    tags.forEach(function (tag) {
      tag.addEventListener("click", function (e) {
        // 拦截跳转，改为弹窗播放；JS 失效时链接仍可直接打开视频文件
        e.preventDefault();
        openVideo(tag);
      });
    });

    document.getElementById("vmClose").addEventListener("click", closeVideo);
    videoModal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-vm-close")) { closeVideo(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && videoModal.classList.contains("open")) { closeVideo(); }
    });
  }
})();

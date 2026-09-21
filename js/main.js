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

  /* ---------- 纪实照片：左右滚动播放 ---------- */
  var marquee = document.getElementById("photoMarquee");
  var photos = (typeof GALLERY_PHOTOS !== "undefined") ? GALLERY_PHOTOS : [];
  var dims = (typeof PHOTO_DIMS !== "undefined") ? PHOTO_DIMS : {};
  var galleryImgs = []; // 供灯箱按顺序浏览（按照片序号登记原图）

  if (marquee && photos.length) {
    var mq = window.matchMedia("(max-width: 900px)"); // 手机 2 行、桌面 3 行
    var rows = [];
    var pending = [];        // 待加载队列
    var resumeTimer = null;
    var sectionVisible = false;

    // 加载单张：失败时保留渐变占位而不移除元素，
    // 否则轨道内两组长度不等，循环滚动会出现跳缝
    var loadImg = function (img) {
      if (!img || img.src || img.dataset.loading) { return; }
      img.dataset.loading = "1";
      img.addEventListener("load", function () {
        img.classList.add("loaded");
        img.removeAttribute("data-loading");
      });
      img.addEventListener("error", function () {
        img.removeAttribute("data-loading");
        img.dataset.failed = "1";
      });
      img.src = img.dataset.thumb;
    };

    var build = function () {
      var rowCount = mq.matches ? 2 : 3;
      marquee.innerHTML = "";
      rows = [];
      galleryImgs = [];

      for (var r = 0; r < rowCount; r++) {
        var rowEl = document.createElement("div");
        rowEl.className = "marquee-row";
        rowEl.setAttribute("data-dir", r % 2 === 0 ? "left" : "right");
        var track = document.createElement("div");
        track.className = "marquee-track";
        rowEl.appendChild(track);
        marquee.appendChild(rowEl);
        rows.push(track);
      }

      // 轮流分配到各行，让每一行都有不同场景
      var units = [];
      for (var u = 0; u < rowCount; u++) { units.push([]); }

      photos.forEach(function (file, idx) {
        var item = document.createElement("figure");
        item.className = "marquee-item";
        var d = dims[file];
        if (d) { item.style.setProperty("--ar", d[0] + " / " + d[1]); }

        var img = document.createElement("img");
        img.alt = "实训营纪实照片 " + (idx + 1);
        img.decoding = "async";
        img.dataset.thumb = "img/thumbs/" + file;
        img.dataset.full = "img/photos/" + file;
        img.dataset.index = idx;
        item.appendChild(img);

        units[idx % rowCount].push(item);
        galleryImgs[idx] = img;   // 原图登记，灯箱使用
      });

      // 填入轨道，并复制一组用于无缝循环（-50% 位移刚好衔接）
      units.forEach(function (list, r) {
        var track = rows[r];
        list.forEach(function (item) { track.appendChild(item); });
        list.forEach(function (item) { track.appendChild(item.cloneNode(true)); });
      });

      // 排队加载：
      // 1) 反向行的起始画面在轨道的复制组，所以从轨道中点开始排队
      // 2) 各行交错合并，保证两行同时填充而不是一行先空着
      var byRow = [];
      rows.forEach(function (track) {
        var arr = Array.prototype.slice.call(track.querySelectorAll("img"));
        if (track.parentElement.dataset.dir === "right") {
          var half = arr.length >> 1;
          arr = arr.slice(half).concat(arr.slice(0, half));
        }
        byRow.push(arr);
      });

      var maxLen = 0;
      byRow.forEach(function (a) { if (a.length > maxLen) { maxLen = a.length; } });
      pending = [];
      for (var k = 0; k < maxLen; k++) {
        for (var r = 0; r < byRow.length; r++) {
          if (byRow[r][k]) { pending.push(byRow[r][k]); }
        }
      }

      // 按轨道实际宽度定时长，使各行速度一致（手机略慢，观感更稳）
      requestAnimationFrame(function () {
        var speed = mq.matches ? 42 : 60;   // px/秒
        rows.forEach(function (track) {
          var w = track.scrollWidth / 2;
          if (w > 0) { track.style.animationDuration = Math.round(w / speed) + "s"; }
        });
      });
    };

    // 进入视野后按队列顺序一次性发起加载，交给浏览器自行调度并发
    var fill = function () {
      if (!sectionVisible) { return; }
      var q = pending;
      pending = [];
      for (var n = 0; n < q.length; n++) { loadImg(q[n]); }
    };

    build();

    var pc = document.getElementById("photoCount");
    if (pc) { pc.textContent = "共 " + photos.length + " 张"; }

    // 章节进入视野后再开始加载
    if ("IntersectionObserver" in window) {
      var secIO = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          sectionVisible = true;
          secIO.disconnect();
          fill();
        }
      }, { rootMargin: "400px" });
      secIO.observe(marquee);
    } else {
      sectionVisible = true;
      fill();
    }

    // 悬停 / 触摸时暂停，方便看清与点开
    var pause  = function () { marquee.classList.add("is-paused"); };
    var resume = function () { marquee.classList.remove("is-paused"); };
    marquee.addEventListener("mouseenter", pause);
    marquee.addEventListener("mouseleave", resume);
    marquee.addEventListener("touchstart", function () {
      clearTimeout(resumeTimer);
      pause();
    }, { passive: true });
    marquee.addEventListener("touchend", function () {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(resume, 1500);
    }, { passive: true });
    marquee.addEventListener("touchcancel", function () { resume(); }, { passive: true });

    // 跨断点时重建行数
    var onBreakpoint = function () {
      build();
      if (sectionVisible) { fill(); }
    };
    if (mq.addEventListener) { mq.addEventListener("change", onBreakpoint); }
    else if (mq.addListener) { mq.addListener(onBreakpoint); }

    /* ---------- 灯箱 ---------- */
    var lightbox = document.getElementById("lightbox");
    var lbImg = document.getElementById("lbImg");
    var lbCounter = document.getElementById("lbCounter");
    var currentIndex = 0;

    var showLb = function (index) {
      if (!galleryImgs.length) { return; }
      currentIndex = (index + galleryImgs.length) % galleryImgs.length;
      var img = galleryImgs[currentIndex];
      if (!img) { return; }
      lbImg.src = img.dataset.full;   // 灯箱看原图，保证清晰
      lbCounter.textContent = (currentIndex + 1) + " / " + galleryImgs.length;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    var closeLb = function () {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      lbImg.src = "";
      document.body.style.overflow = "";
    };

    marquee.addEventListener("click", function (e) {
      var img = e.target.closest ? e.target.closest(".marquee-item img") : null;
      if (img) { showLb(parseInt(img.dataset.index, 10)); }
    });
    document.getElementById("lbClose").addEventListener("click", closeLb);
    document.getElementById("lbPrev").addEventListener("click", function () { showLb(currentIndex - 1); });
    document.getElementById("lbNext").addEventListener("click", function () { showLb(currentIndex + 1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) { closeLb(); }
    });

    // 手机端左右滑动切换
    var swipeX = null;
    lightbox.addEventListener("touchstart", function (e) {
      swipeX = e.touches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (swipeX === null) { return; }
      var dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 45) { showLb(currentIndex + (dx < 0 ? 1 : -1)); }
    }, { passive: true });

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

/**
 * 无级视频倍速
 */

let videoRate = 1.0;
const MIN_VIDEO_RATE = 0.1;
const MAX_VIDEO_RATE = 5.0;
const VIDEO_RATE_STEP = 0.1;

chrome.storage.sync.get(['biliplus-enable', 'stepless-video-rate'], storage => {
  if (storage['biliplus-enable'] && storage['stepless-video-rate']) {
    let hideBoxTimeout = null;
    const rateButton = `
      <div class="stepless-video-rate-btn" role="button" aria-label="无级倍速" tabindex="0">
        <div class="stepless-video-rate-btn-result">无级倍速</div>
        <div class="stepless-video-rate-box">
          <div class="stepless-video-rate-number">
            <button type="button" class="stepless-video-rate-step stepless-video-rate-step-minus" aria-label="降低倍速">-</button>
            <input class="stepless-video-rate-input" type="number" min="0.1" max="5.0" step="0.1" value="1.0" aria-label="输入倍速" />
            <button type="button" class="stepless-video-rate-step stepless-video-rate-step-plus" aria-label="提高倍速">+</button>
          </div>
          <div
            class="stepless-video-rate-slider"
            role="slider"
            aria-label="倍速"
            aria-valuemin="0.1"
            aria-valuemax="5.0"
            aria-valuenow="1.0"
            tabindex="0"
          >
            <div class="stepless-video-rate-track">
              <div class="stepless-video-rate-fill"></div>
              <div class="stepless-video-rate-thumb">
                <div class="stepless-video-rate-thumb-dot"></div>
              </div>
            </div>
          </div>
        </div>      
      </div>
    `;

    document.body.classList.add('biliplus-stepless-video-rate');

    // 用 MutationObserver 解决页面初始化时无法找到 bpx-player-ctrl-playbackrate 按钮
    const disconnect = _UTILS.observe(document.body, () => {
      if (document.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-playbackrate') == null) {
        return;
      }
      if (document.querySelector('.stepless-video-rate-btn') == null) {
        const playerControl = document.querySelector('.bpx-player-control-bottom-right');
        const oldRateButton = document.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-playbackrate');

        const newRateButton = document.createElement('div');
        playerControl.insertBefore(newRateButton, oldRateButton);
        newRateButton.outerHTML = rateButton;

        const box = document.querySelector('.stepless-video-rate-box');
        const slider = document.querySelector('.stepless-video-rate-slider');
        const fill = document.querySelector('.stepless-video-rate-fill');
        const thumb = document.querySelector('.stepless-video-rate-thumb');
        const rateInput = document.querySelector('.stepless-video-rate-input');
        const decreaseRateButton = document.querySelector('.stepless-video-rate-step-minus');
        const increaseRateButton = document.querySelector('.stepless-video-rate-step-plus');
        const steplessBtn = document.querySelector('.stepless-video-rate-btn-result');
        const steplessRateButton = document.querySelector('.stepless-video-rate-btn');

        // 进入 btn 就显示 box
        steplessRateButton.addEventListener('mouseenter', () => {
          showBox();
          if (hideBoxTimeout != null) {
            clearTimeout(hideBoxTimeout);
          }
        });

        // 离开 btn 就消失 box
        steplessRateButton.addEventListener('mouseleave', () => {
          // 防抖 400 ms
          hideBoxTimeout = setTimeout(() => {
            hideBox();
          }, 400);
        });

        function formatRate(rate) {
          return Number(rate).toFixed(1);
        }

        function normalizeRate(rate) {
          const parsedRate = Number(rate);
          if (!Number.isFinite(parsedRate)) {
            return videoRate;
          }
          return Math.min(MAX_VIDEO_RATE, Math.max(MIN_VIDEO_RATE, parsedRate));
        }

        function updateRate(rate) {
          videoRate = Number(normalizeRate(rate).toFixed(1));
          const ratePercent = ((videoRate - MIN_VIDEO_RATE) / (MAX_VIDEO_RATE - MIN_VIDEO_RATE)) * 100;

          rateInput.value = formatRate(videoRate);
          fill.style.height = `${ratePercent}%`;
          thumb.style.bottom = `${ratePercent}%`;
          slider.setAttribute('aria-valuenow', formatRate(videoRate));
          slider.setAttribute('aria-valuetext', `${formatRate(videoRate)}倍速`);

          const video = document.querySelector('video');
          if (video != null) {
            video.playbackRate = videoRate;
          }
        }

        function getRateByPointer(event) {
          const sliderRect = slider.getBoundingClientRect();
          const sliderPercent = Math.min(1, Math.max(0, (sliderRect.bottom - event.clientY) / sliderRect.height));
          return MIN_VIDEO_RATE + sliderPercent * (MAX_VIDEO_RATE - MIN_VIDEO_RATE);
        }

        function updateRateByPointer(event) {
          event.preventDefault();
          updateRate(getRateByPointer(event));
        }

        function stopDragging() {
          document.removeEventListener('mousemove', updateRateByPointer);
          document.removeEventListener('mouseup', stopDragging);
        }

        function startDragging(event) {
          updateRateByPointer(event);
          document.addEventListener('mousemove', updateRateByPointer);
          document.addEventListener('mouseup', stopDragging);
        }

        function updateRateByStep(direction) {
          updateRate(videoRate + direction * VIDEO_RATE_STEP);
        }

        function updateRateByWheel(event) {
          event.preventDefault();
          showBox();
          updateRateByStep(event.deltaY > 0 ? -1 : 1);
        }

        function updateRateByKeyboard(event) {
          if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
            event.preventDefault();
            updateRateByStep(1);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
            event.preventDefault();
            updateRateByStep(-1);
          }
        }

        slider.addEventListener('mousedown', startDragging);
        slider.addEventListener('keydown', updateRateByKeyboard);

        decreaseRateButton.addEventListener('click', () => {
          updateRateByStep(-1);
        });

        increaseRateButton.addEventListener('click', () => {
          updateRateByStep(1);
        });

        rateInput.addEventListener('change', () => {
          updateRate(rateInput.value);
        });

        rateInput.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            updateRate(rateInput.value);
            rateInput.blur();
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            updateRateByStep(1);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            updateRateByStep(-1);
          }
        });

        steplessRateButton.addEventListener('wheel', updateRateByWheel, { passive: false });

        // double click to reset rate
        steplessBtn.addEventListener('dblclick', () => {
          updateRate(1.0);
        });

        updateRate(videoRate);
      }else{
        disconnect();
      }
    });
  }
});

function showBox() {
  const rateBox = document.querySelector('.stepless-video-rate-box');
  if (rateBox != null && !rateBox.classList.contains('display')) {
    rateBox.classList.add('display');
  }
}

function hideBox() {
  const rateBox = document.querySelector('.stepless-video-rate-box');
  if (rateBox != null && rateBox.classList.contains('display')) {
    rateBox.classList.remove('display');
  }
}

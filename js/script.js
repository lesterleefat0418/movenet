let videoPlayer;
let detector;
let overlayCanvas;
let overlayCtx;

// MoveNetモデルを読み込む関数
async function loadMoveNet() {
    try {
        await tf.setBackend('webgl');
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            });
    } catch (error) {
        console.error('MoveNet モデルの読み込みに失敗しました:', error);
    }
}

// ビデオからポーズを推定する関数
async function estimatePoses(video) {
    try {
        return await detector.estimatePoses(video);
    } catch (error) {
        console.error('姿勢推定に失敗しました:', error);
        return [];
    }
}

// カメラの読み込みを行う関数
async function loadCamera() {
    const constraints = {
        video: {
            width: 640,
            height: 480,
            aspectRatio: 1.33
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPlayer.srcObject = stream;
    } catch (error) {
        console.error('カメラのアクセスに失敗:', error);
    }
}

// 選択した動画を再生し、ポーズ検出を開始する関数
async function playSelectedVideo() {
    await videoPlayer.play();
    detect();
}

// キーポイントを描画する関数（オーバーレイ用）
function drawKeypoints(keypoints, context) {
    keypoints.forEach((keypoint) => {

        const color = `rgba(255, 0, 0, ${keypoint.score})`;

        // 円の描画
        context.beginPath();
        context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        context.fillStyle = color;
        context.fill();
        context.closePath();
    });
}

// ボディラインを描画する関数（オーバーレイ用）
function drawBodyLines(keypoints, context) {
    context.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    context.lineWidth = 4;

    // 人体のラインを定義
    const bodyLines = [
        [3, 1], [1, 0], [0, 2], [2, 4], // 顔
        [9, 7], [7, 5], //左腕
        [10, 8], [8, 6], //右腕
        [6, 5], [5, 11], [11, 12], [12, 6],//胴体
        [12, 14], [14, 16], [11, 13], [13, 15],//脚
    ];

    bodyLines.forEach((line) => {
        const start = keypoints[line[0]];
        const end = keypoints[line[1]];

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        context.closePath();
    });
}

// ポーズを検出し続ける関数
async function detect() {
    try {
        if (!videoPlayer.paused && !videoPlayer.ended) {
            const poses = await estimatePoses(videoPlayer);
            if (poses.length > 0) {
                // オーバーレイ用のキャンバスをクリアしてキーポイントを描画
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                poses.forEach((pose) => {
                    drawKeypoints(pose.keypoints, overlayCtx);
                    drawBodyLines(pose.keypoints, overlayCtx);
                });
            }
        }
    } catch (error) {
        console.error('姿勢推定に失敗しました:', error);
    }
    requestAnimationFrame(detect);
}

// ページの読み込みが完了したらMoveNetモデルを読み込み、要素を取得する
window.onload = async function () {
    await loadMoveNet();
    videoPlayer = document.getElementById('videoPlayer');
    overlayCanvas = document.getElementById('overlayCanvas');
    overlayCtx = overlayCanvas.getContext('2d');

    // カメラ映像の読み込み
    await loadCamera();

    videoPlayer.addEventListener('loadedmetadata', function () {
        playSelectedVideo();
    });
};
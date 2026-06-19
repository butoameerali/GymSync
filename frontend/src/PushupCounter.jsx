import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";

const PushupCounter = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [count, setCount] = useState(0);
  const [stage, setStage] = useState("up"); // UI ke liye
  const stageRef = useRef("up"); // Logic ke liye taake stale state na ho
  const [isReady, setIsReady] = useState(false);

  const calculateAngle = (pointA, pointB, pointC) => {
    const radians =
      Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
      Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  };

  const runPoseDetection = async () => {
    await tf.ready();
    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    setIsReady(true);

    // Interval ek hi baar chalega
    setInterval(() => {
      detectPose(detector);
    }, 100);
  };

  const detectPose = async (detector) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const poses = await detector.estimatePoses(video);

      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        const shoulder = keypoints.find((kp) => kp.name === "left_shoulder");
        const elbow = keypoints.find((kp) => kp.name === "left_elbow");
        const wrist = keypoints.find((kp) => kp.name === "left_wrist");

        if (shoulder.score > 0.5 && elbow.score > 0.5 && wrist.score > 0.5) {
          const angle = calculateAngle(shoulder, elbow, wrist);

          // Push-up Logic using stageRef
          if (angle > 160) {
            if (stageRef.current === "down") {
              setCount((prevCount) => prevCount + 1);
            }
            stageRef.current = "up";
            setStage("up"); // UI update karne ke liye
          }
          if (angle < 90) {
            stageRef.current = "down";
            setStage("down"); // UI update karne ke liye
          }
        }
      }
    }
  };

  // Dependency array khali rakhni hai taake model sirf ek baar load ho
  useEffect(() => {
    runPoseDetection();
  }, []); 

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>🏋️‍♂️ GymSync: AI Push-up Trainer</h2>
      
      {!isReady ? (
        <p>Loading AI Model... Please wait.</p>
      ) : (
        <div style={{ position: "relative", width: "640px", margin: "0 auto" }}>
          <Webcam
            ref={webcamRef}
            style={{ position: "absolute", left: 0, right: 0, margin: "auto", zIndex: 9, width: 640, height: 480, borderRadius: "10px" }}
          />
        </div>
      )}

      <div style={{ marginTop: "520px", fontSize: "24px" }}>
        <h3>Count: <span style={{ color: "green", fontSize: "40px" }}>{count}</span></h3>
        <p>Current Stage: <strong>{stage.toUpperCase()}</strong></p>
      </div>
    </div>
  );
};

export default PushupCounter;
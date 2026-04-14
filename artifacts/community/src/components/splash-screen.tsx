import { useState, useEffect } from "react";

type Phase = "slide1" | "exit1" | "slide2" | "exit2" | "done";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<Phase>("slide1");

  useEffect(() => {
    const timings: [Phase, number][] = [
      ["exit1", 1200],
      ["slide2", 1700],
      ["exit2", 2900],
      ["done", 3400],
    ];

    const timeouts = timings.map(([nextPhase, delay]) =>
      setTimeout(() => {
        if (nextPhase === "done") {
          onComplete();
        } else {
          setPhase(nextPhase);
        }
      }, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  const getTextClass = () => {
    if (phase === "slide1") return "animate-slide-in";
    if (phase === "exit1") return "animate-slide-out";
    if (phase === "slide2") return "animate-slide-in";
    if (phase === "exit2") return "animate-slide-out";
    return "";
  };

  const text = phase === "slide2" || phase === "exit2" ? "내가 기계다" : "내가 누구야";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#003DA5" }}>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-120%);
            opacity: 0;
          }
          to {
            transform: translateX(0%);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0%);
            opacity: 1;
          }
          to {
            transform: translateX(120%);
            opacity: 0;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-slide-out {
          animation: slideOut 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }
      `}</style>
      <span
        key={text}
        className={`text-white font-bold select-none ${getTextClass()}`}
        style={{ fontSize: "clamp(2.5rem, 10vw, 5rem)", letterSpacing: "-0.02em" }}
      >
        {text}
      </span>
    </div>
  );
}

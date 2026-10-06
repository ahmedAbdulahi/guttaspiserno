import { useEffect, useRef, useState } from "react";
import "./MouseTrail.css";

const FOOD_IMAGES = [
  "/food/food1.jpg",
  "/food/food2.jpg",
  "/food/food3.jpg",
  "/food/food4.jpg",
  "/food/food5.jpg",
  "/food/food6.jpg",
];

const MAX_VISIBLE = 50;
const MIN_DISTANCE_PX = 60;
const LIFETIME_MS = 1000;

export default function MouseTrail({ active = true }) {
  const [trail, setTrail] = useState([]);
  const lastPosRef = useRef(null);
  const idRef = useRef(0);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      setTrail([]);
    }
  }, [active]);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!activeRef.current) return;

      const { clientX: x, clientY: y } = e;

      if (lastPosRef.current) {
        const dx = x - lastPosRef.current.x;
        const dy = y - lastPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE_PX) return;
      }
      lastPosRef.current = { x, y };

      const id = idRef.current++;
      const src = FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)];

      setTrail((prev) => {
        const next = [...prev, { id, x, y, src }];
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });

      setTimeout(() => {
        setTrail((prev) => prev.filter((item) => item.id !== id));
      }, LIFETIME_MS);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="mouse-trail">
      {trail.map((item) => (
        <div
          key={item.id}
          className="mouse-trail-item"
          style={{ left: item.x, top: item.y }}
        >
          <img src={item.src} alt="" className="mouse-trail-img" />
        </div>
      ))}
    </div>
  );
}

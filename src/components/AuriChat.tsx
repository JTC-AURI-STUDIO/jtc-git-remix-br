import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const AuriChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const isDraggingRef = useRef(false);
  const hasMoved = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });

  // Initialize position
  useEffect(() => {
    const savedPosition = localStorage.getItem("auriChatPosition");
    if (savedPosition) {
      const parsed = JSON.parse(savedPosition);
      positionRef.current = parsed;
      setPosition(parsed);
    } else {
      const defaultPos = { 
        x: window.innerWidth - 80, 
        y: window.innerHeight - 100 
      };
      positionRef.current = defaultPos;
      setPosition(defaultPos);
    }
    setIsInitialized(true);
  }, []);

  // Direct DOM manipulation for zero-lag dragging
  const updateButtonPosition = useCallback((x: number, y: number) => {
    if (buttonRef.current) {
      buttonRef.current.style.left = `${x}px`;
      buttonRef.current.style.top = `${y}px`;
    }
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    hasMoved.current = false;
    
    if (buttonRef.current) {
      buttonRef.current.style.transition = 'none';
      buttonRef.current.style.transform = 'scale(1.1)';
    }
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    
    const buttonSize = 56;
    const newX = Math.max(0, Math.min(window.innerWidth - buttonSize, clientX - buttonSize / 2));
    const newY = Math.max(0, Math.min(window.innerHeight - buttonSize, clientY - buttonSize / 2));
    
    // Check if actually moved
    if (Math.abs(newX - positionRef.current.x) > 3 || Math.abs(newY - positionRef.current.y) > 3) {
      hasMoved.current = true;
    }
    
    positionRef.current = { x: newX, y: newY };
    updateButtonPosition(newX, newY);
  }, [updateButtonPosition]);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    if (buttonRef.current) {
      buttonRef.current.style.transition = 'transform 0.2s ease-out';
      buttonRef.current.style.transform = 'scale(1)';
    }
    
    // Save position
    setPosition(positionRef.current);
    localStorage.setItem("auriChatPosition", JSON.stringify(positionRef.current));
  }, []);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  // Global event listeners
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const handleClick = useCallback(() => {
    // Only navigate if we didn't drag
    if (!hasMoved.current) {
      navigate("/auri");
    }
    hasMoved.current = false;
  }, [navigate]);

  // Don't show on /auri page
  if (location.pathname === "/auri") {
    return null;
  }

  if (!isInitialized) {
    return null;
  }

  return (
    <Button
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="fixed z-50 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 cursor-grab active:cursor-grabbing select-none"
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
        transition: "transform 0.2s ease-out, box-shadow 0.2s ease-out",
        willChange: "left, top, transform",
      }}
      size="icon"
    >
      <Sparkles className="h-6 w-6 text-white pointer-events-none" />
    </Button>
  );
};

import React from "react";

/**
 * 3D Touch Effect Hook
 * Adds dynamic 3D perspective based on mouse position
 */
export const use3DTouchEffect = (ref: React.RefObject<HTMLElement>) => {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate rotation angles based on mouse position
      const rotationX = ((y / rect.height) - 0.5) * 10; // -5 to +5 degrees
      const rotationY = ((x / rect.width) - 0.5) * -10; // -5 to +5 degrees

      // Calculate distance from center for glow intensity
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      const maxDistance = Math.sqrt(
        Math.pow(centerX, 2) + Math.pow(centerY, 2)
      );
      const glowIntensity = 1 - (distance / maxDistance) * 0.5;

      // Apply the 3D transform
      const inner = element.querySelector('.prompt-box-3d-inner') as HTMLElement;
      if (inner) {
        inner.style.transform = `
          translateZ(10px)
          rotateX(${rotationX}deg)
          rotateY(${rotationY}deg)
        `;
      }

      // Apply glow effect
      element.style.setProperty(
        '--glow-intensity',
        glowIntensity.toString()
      );
    };

    const handleMouseLeave = () => {
      const inner = element.querySelector('.prompt-box-3d-inner') as HTMLElement;
      if (inner) {
        inner.style.transform = 'translateZ(0px) rotateX(0deg) rotateY(0deg)';
      }
      element.style.setProperty('--glow-intensity', '0');
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref]);
};

/**
 * Usage in component:
 * 
 * const promptBoxRef = React.useRef<HTMLDivElement>(null);
 * use3DTouchEffect(promptBoxRef);
 * 
 * Then use ref={promptBoxRef} on your element
 */

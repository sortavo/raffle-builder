/**
 * Handles smooth scrolling to a section on the page
 * If the target section doesn't exist (different page), navigates to home first
 */
export const scrollToSection = (sectionId: string, callback?: () => void) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    callback?.();
  } else {
    // If element not found, we're on a different page
    // Navigate to home and scroll after load
    window.location.href = `/#${sectionId}`;
  }
};

/**
 * Handles hash navigation on page load
 * Call this in useEffect to handle initial hash scrolling
 */
export const handleHashScroll = () => {
  const hash = window.location.hash;
  if (hash) {
    const sectionId = hash.replace('#', '');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      element?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
};

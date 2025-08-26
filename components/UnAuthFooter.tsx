"use client";

export function UnAuthFooter() {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6">
      <div className="text-center text-sm text-gray-400 max-w-4xl mx-auto">
        <span>By messaging ChatGPT, you agree to our </span>
        <a
          href="#"
          className="text-white underline hover:no-underline transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Terms
        </a>
        <span> and have read our </span>
        <a
          href="#"
          className="text-white underline hover:no-underline transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Privacy Policy
        </a>
        <span>. See </span>
        <a
          href="#"
          className="text-white underline hover:no-underline transition-colors"
          onClick={(e) => e.preventDefault()}
        >
          Cookie Preferences
        </a>
        <span>.</span>
      </div>
    </div>
  );
}
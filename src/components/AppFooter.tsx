const AppFooter = () => {
  return (
    <footer className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
      <a
        href="mailto:0xpankajkumar@gmail.com"
        className="hover:text-primary transition-colors"
      >
        0xpankajkumar@gmail.com
      </a>
      <span>
        © {new Date().getFullYear()} RojRoutine by{" "}
        <a
          href="https://x.com/0xpankajkumar"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          0xpankajkumar
        </a>
      </span>
    </footer>
  );
};

export default AppFooter;

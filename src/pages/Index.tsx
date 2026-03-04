const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient glow behind text */}
      <div className="absolute w-[600px] h-[300px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      
      <h1
        className="relative text-6xl md:text-8xl font-black tracking-wider text-primary select-none"
        style={{
          textShadow: `
            0 0 10px hsl(199 89% 48% / 0.8),
            0 0 30px hsl(199 89% 48% / 0.6),
            0 0 60px hsl(199 89% 48% / 0.4),
            0 0 100px hsl(199 89% 48% / 0.2)
          `,
          animation: 'glow 3s ease-in-out infinite alternate',
        }}
      >
        JTC FLUX PDV
      </h1>

      <style>{`
        @keyframes glow {
          from {
            text-shadow:
              0 0 10px hsl(199 89% 48% / 0.8),
              0 0 30px hsl(199 89% 48% / 0.5),
              0 0 60px hsl(199 89% 48% / 0.3),
              0 0 100px hsl(199 89% 48% / 0.15);
          }
          to {
            text-shadow:
              0 0 15px hsl(199 89% 48% / 1),
              0 0 40px hsl(199 89% 48% / 0.7),
              0 0 80px hsl(199 89% 48% / 0.5),
              0 0 140px hsl(199 89% 48% / 0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default Index;

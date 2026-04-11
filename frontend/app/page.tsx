import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans overflow-hidden">
      {/* Navbar */}
      <header className="absolute top-0 w-full z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 9h3v10h12V9h3L12 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">Raahi</span>
          </div>
          <nav className="flex items-center gap-8 bg-white rounded-full border border-zinc-200 px-4 py-2 hover:bg-zinc-900 transition-all group">
  <Link 
    href="/map" 
    className="text-sm font-medium text-zinc-600 group-hover:text-white transition-colors"
  >
    Open Map
  </Link>
</nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20 relative">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10 mt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-medium shadow-xl backdrop-blur-sm">
             <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            We tell you the safest route possible
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.05]">
            Navigate With <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300">Absolute Confidence.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            SafeStep AI is a safety-aware navigation engine that routes you through well-lit, populated, and community-verified safe paths.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/map" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black transition-all duration-200 bg-white border border-transparent rounded-full hover:bg-zinc-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white">
              Plan Safe Route
              <svg className="w-5 h-5 ml-2 -mr-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import ColorSelector from './ColorSelector';

const Header: React.FC = () => {
  const [isColorSelectorOpen, setIsColorSelectorOpen] = useState(false);

  return (
    <header className="navbar sticky top-0 z-50">
      <div className="container navbar-container">
        <a href="#" className="navbar-brand text-2xl font-bold">
          瞬刻TransAI
        </a>
        <nav className="navbar-links hidden md:flex">
          <a href="#" className="navbar-link text-lg">定价</a>
          <a href="#" className="navbar-link text-lg">常见问题</a>
          <a href="#" className="navbar-link text-lg">博客</a>
        </nav>
        <div className="flex items-center gap-4">
          <button 
            className="btn btn-outline text-lg px-4 py-2"
            onClick={() => setIsColorSelectorOpen(true)}
          >
            更换网页配色
          </button>
          <a href="#" className="navbar-link text-lg">中文</a>
          <button className="btn btn-primary text-lg px-4 py-2">登录</button>
          <button className="btn btn-primary text-lg px-6 py-2">注册</button>
        </div>
      </div>
      <ColorSelector 
        isOpen={isColorSelectorOpen} 
        onClose={() => setIsColorSelectorOpen(false)} 
      />
    </header>
  );
};

export default Header;
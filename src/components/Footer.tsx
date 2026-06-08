import React from 'react';
import { Cloud, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Cloud className="h-8 w-8 text-white" />
            <h2 className="text-2xl font-bold text-white">瞬刻TransAI</h2>
          </div>
          <p className="text-lg text-white/80 mb-6">
            提供高精度中文音频转录、AI智能总结、说话人分离等功能，为创作者提供高效的内容处理工具。
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-white/80 hover:text-white transition-colors">
              <Github className="h-6 w-6" />
            </a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">
              <Twitter className="h-6 w-6" />
            </a>
            <a href="#" className="text-white/80 hover:text-white transition-colors">
              <Linkedin className="h-6 w-6" />
            </a>
          </div>
        </div>
        <div>
          <h3 className="footer-title">功能</h3>
          <ul className="footer-links">
            <li><a href="#" className="footer-link">音频转录</a></li>
            <li><a href="#" className="footer-link">AI总结</a></li>
            <li><a href="#" className="footer-link">说话人分离</a></li>
            <li><a href="#" className="footer-link">多格式导出</a></li>
          </ul>
        </div>
        <div>
          <h3 className="footer-title">关于</h3>
          <ul className="footer-links">
            <li><a href="#" className="footer-link">公司介绍</a></li>
            <li><a href="#" className="footer-link">团队成员</a></li>
            <li><a href="#" className="footer-link">技术博客</a></li>
            <li><a href="#" className="footer-link">联系我们</a></li>
          </ul>
        </div>
        <div>
          <h3 className="footer-title">支持</h3>
          <ul className="footer-links">
            <li><a href="#" className="footer-link">帮助中心</a></li>
            <li><a href="#" className="footer-link">常见问题</a></li>
            <li><a href="#" className="footer-link">使用教程</a></li>
            <li><a href="#" className="footer-link">隐私政策</a></li>
          </ul>
        </div>
      </div>
      <div className="copyright">
        <p>© 2026 瞬刻TransAI. 保留所有权利。</p>
      </div>
    </footer>
  );
};

export default Footer;
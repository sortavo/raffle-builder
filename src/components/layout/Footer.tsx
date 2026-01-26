import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin } from 'lucide-react';
import sortavoLogo from "@/assets/sortavo-logo.png";
import { scrollToSection } from '@/lib/scroll-utils';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ultra-dark text-ultra-dark-dimmed print:hidden border-t border-ultra-dark">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Producto</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-emerald-400 transition-colors">
                  Planes y Precios
                </Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-emerald-400 transition-colors">
                  Características
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="hover:text-emerald-400 transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-emerald-400 transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link to="/terms#legal-notice" className="hover:text-emerald-400 transition-colors">
                  Aviso Legal
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Soporte</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="hover:text-emerald-400 transition-colors">
                  Centro de Ayuda
                </Link>
              </li>
              <li>
                <Link to="/help#faq" className="hover:text-emerald-400 transition-colors">
                  Preguntas Frecuentes
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link to="/status" className="hover:text-emerald-400 transition-colors">
                  Estado del Sistema
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white font-semibold mb-4">Síguenos</h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                aria-label="X"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/sortavo/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>

            {/* Logo */}
            <div className="mt-6">
              <Link to="/" className="block">
                <img src={sortavoLogo} alt="Sortavo" className="h-8 w-auto" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {currentYear} Sortavo. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">🌐 Español (MX)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";
import { scrollToSection } from "@/lib/scroll-utils";
import { Menu, ArrowRight } from "lucide-react";
import sortavoLogo from "@/assets/sortavo-logo.png";

interface NavLink {
  label: string;
  href: string;
}

interface PremiumNavbarProps {
  variant?: 'transparent' | 'solid';
  showCTA?: boolean;
}

const defaultNavLinks: NavLink[] = [
  { label: 'Características', href: '/#features' },
  { label: 'Precios', href: '/pricing' },
  { label: 'Ayuda', href: '/help' },
];

export function PremiumNavbar({ variant = 'transparent', showCTA = true }: PremiumNavbarProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (variant === 'transparent') {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [variant]);

  const handleNavClick = (href: string, callback?: () => void) => {
    if (href.startsWith('/#')) {
      scrollToSection(href.replace('/#', ''), callback);
    } else {
      callback?.();
    }
  };

  const navClasses = variant === 'transparent'
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-gray-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg' 
          : 'bg-transparent'
      }`
    : 'fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/10';

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={navClasses}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={sortavoLogo} 
              alt="Sortavo" 
              className="h-8 lg:h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {defaultNavLinks.map((link) => (
              link.href.startsWith('/#') ? (
                <a 
                  key={link.label}
                  href={link.href.replace('/', '')}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  {link.label}
                </a>
              ) : (
                <Link 
                  key={link.label}
                  to={link.href} 
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors font-medium rounded-lg hover:bg-white/10"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {showCTA && (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="font-medium text-gray-200 hover:text-white hover:bg-white/10">
                  Iniciar Sesión
                </Button>
              </Link>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25 font-medium border-0"
              >
                Comenzar Gratis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="relative text-gray-200 hover:text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-gray-950 border-white/10">
              <div className="flex flex-col gap-6 mt-8">
                {defaultNavLinks.map((link) => (
                  link.href.startsWith('/#') ? (
                    <a 
                      key={link.label}
                      href={link.href.replace('/', '')}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(link.href, () => setMobileMenuOpen(false));
                      }}
                      className="text-lg font-medium text-gray-200 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link 
                      key={link.label}
                      to={link.href} 
                      className="text-lg font-medium text-gray-200 hover:text-emerald-400 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                <hr className="border-white/10" />
                <Link 
                  to="/auth" 
                  className="text-lg font-medium text-gray-200 hover:text-emerald-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
                <Button 
                  onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white w-full"
                >
                  Comenzar Gratis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
}

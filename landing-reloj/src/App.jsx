import React from 'react';
import { Watch, ShieldCheck, Droplets, Zap, ChevronRight, ShoppingCart } from 'lucide-react';
import './index.css';

function App() {
  return (
    <>
      {/* Background elements */}
      <div className="hero-bg"></div>

      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-content">
          <div className="hero-text">
            <h4 className="gold-text" style={{ marginBottom: '1rem', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
              Edición Limitada
            </h4>
            <h1>Reloj Elegante<br/><span className="gold-text">Tipo Rolex ⭐⭐⭐⭐⭐</span></h1>
            <p>Cada segundo cuenta para alcanzar tus metas, y este reloj está diseñado para acompañarte en cada paso hacia tu grandeza. No es solo un reloj, es una declaración de quién eres y hacia dónde te diriges.</p>
            <a href="#comprar" className="btn-primary">
              Comprar Ahora <ShoppingCart size={20} />
            </a>
          </div>
          <div className="hero-image">
            <div className="glow-effect"></div>
            <img 
              src="https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1000&auto=format&fit=crop" 
              alt="Reloj Elegante Principal" 
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features container">
        <h2 className="section-title">Características <span className="gold-text">Premium</span></h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Watch size={30} /></div>
            <h3>Cronógrafo Multifuncional</h3>
            <p>Esfera en varios colores, bisel giratorio unidireccional y movimiento de cuarzo de alta precisión.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><ShieldCheck size={30} /></div>
            <h3>Acero Inoxidable</h3>
            <p>Materiales premium duraderos, vidrio mineral resistente a arañazos para una larga vida útil.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Droplets size={30} /></div>
            <h3>Resistencia 3 ATM</h3>
            <p>Resistente a salpicaduras y uso diario, asegurando tranquilidad en cualquier clima.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={30} /></div>
            <h3>Función Luminosa</h3>
            <p>Brillo sutil en la oscuridad que permite ver la hora claramente en ambientes de poca luz.</p>
          </div>
        </div>
      </section>

      {/* Lifestyle Section */}
      <section className="lifestyle">
        <div className="container lifestyle-content">
          <div className="lifestyle-image">
            <img 
              src="https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000&auto=format&fit=crop" 
              alt="Reloj Elegante Lifestyle" 
            />
          </div>
          <div className="lifestyle-text">
            <h2>El toque final para un <span className="gold-text">look impecable</span> 🎩⚡</h2>
            <p>Un accesorio que eleva tu presencia. Su esfera sofisticada, correa de acero inoxidable y acabados de alta calidad lo convierten en el complemento ideal para cualquier ocasión.</p>
            <p style={{ marginBottom: '2rem' }}>Gracias a su función luminosa, este reloj no solo destaca por su diseño, sino también por su practicidad, acompañándote de día y de noche.</p>
            <a href="#comprar" className="btn-primary">
              Adquirir Promoción <ChevronRight size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq container">
        <h2 className="section-title">Preguntas <span className="gold-text">Frecuentes</span></h2>
        <div className="faq-list">
          <div className="faq-item">
            <div className="faq-q">¿Es resistente al agua?</div>
            <div className="faq-a">✅ Sí, el reloj tiene una resistencia al agua de 3 ATM, lo que lo hace apto para salpicaduras y uso diario. No es recomendable sumergirlo en agua a presión.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">¿Se puede ajustar a mi muñeca?</div>
            <div className="faq-a">✅ Sí, el reloj incluye una herramienta de ajuste para que puedas adaptar fácilmente la correa de acero inoxidable a la medida exacta de tu muñeca.</div>
          </div>
          <div className="faq-item">
            <div className="faq-q">¿Cuáles son sus funciones principales?</div>
            <div className="faq-a">✅ Además de dar la hora con precisión gracias a su movimiento de cuarzo, cuenta con cronógrafo, bisel giratorio, visualización 24 horas y función luminosa nocturna.</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ color: 'var(--text-muted)' }}>© {new Date().getFullYear()} Antojate Shop. Todos los derechos reservados.</p>
      </footer>

      {/* Floating CTA */}
      <div className="float-cta">
        <a href="#comprar" className="btn-primary" style={{ boxShadow: '0 10px 40px rgba(212, 175, 55, 0.4)' }}>
          ¡Comprar Ahora! <ShoppingCart size={20} />
        </a>
      </div>
    </>
  );
}

export default App;

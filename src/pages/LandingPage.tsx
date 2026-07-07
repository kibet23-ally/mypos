import React from "react";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(248, 250, 252, 0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563EB, #60A5FA)",
                boxShadow: "0 10px 25px rgba(37, 99, 235, 0.18)",
              }}
            />
            <div>
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>posifypro</div>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 650 }}>
                Modern POS for Kenyan businesses
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <a href="#features" style={linkStyle}>
              Features
            </a>
            <a href="#how-it-works" style={linkStyle}>
              How it works
            </a>
            <a href="#pricing" style={linkStyle}>
              Pricing
            </a>
            <a href="/login" style={secondaryBtnStyle}>
              Log in
            </a>
            <a href="/login" style={primaryBtnStyle}>
              Start free trial
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "52px 20px 18px",
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(37, 99, 235, 0.08)",
                color: "#1D4ED8",
                border: "1px solid rgba(37, 99, 235, 0.18)",
                fontWeight: 750,
                fontSize: 13,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "#1D4ED8" }} />
              One-time payment license
            </div>

            <h1 style={{ margin: "16px 0 12px", fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.04em" }}>
              Run sales, inventory, and reports—fast and confidently.
            </h1>

            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "#334155", maxWidth: 580 }}>
              posifypro helps shops and service businesses in Kenya manage orders, track stock, and generate clear
              reports—so you spend less time on paperwork and more time growing.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
              <a href="/login" style={{ ...primaryBtnStyle, padding: "12px 16px" }}>
                Start free trial
              </a>
              <a href="#pricing" style={{ ...secondaryBtnStyle, padding: "12px 16px" }}>
                View pricing
              </a>
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={pillStyle}>
                <span style={checkStyle} />
                Quick setup
              </div>
              <div style={pillStyle}>
                <span style={checkStyle} />
                Built for shops & services
              </div>
              <div style={pillStyle}>
                <span style={checkStyle} />
                Pay once, keep going
              </div>
            </div>
          </div>

          <div>
            <div style={heroCardStyle}>
              <div style={heroCardTopStyle}>
                <div>
                  <div style={{ fontWeight: 900 }}>Today’s snapshot</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Quick overview for your store</div>
                </div>

                <div style={heroBadgeStyle}>KSh</div>
              </div>

              <div style={{ padding: 16 }}>
                <div style={metricRowStyle}>
                  <div style={metricLabelStyle}>Sales today</div>
                  <div style={metricValueStyle}>148,200</div>
                </div>
                <div style={metricRowStyle}>
                  <div style={metricLabelStyle}>Orders</div>
                  <div style={metricValueStyle}>63</div>
                </div>
                <div style={metricRowStyle}>
                  <div style={metricLabelStyle}>Low stock alerts</div>
                  <div style={metricValueStyle}>4</div>
                </div>

                <div style={recommendationStyle}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Recommendation</div>
                  <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
                    Reorder low-stock items to avoid missed sales—posifypro keeps you on track.
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href="/login" style={tertiaryBtnStyle}>
                      Create your workspace
                    </a>
                    <a href="#features" style={ghostBtnStyle}>
                      See features
                    </a>
                  </div>
                </div>
              </div>

              <div style={heroCardBottomStyle}>
                <div style={miniStatStyle}>
                  <div style={miniStatLabelStyle}>Uptime</div>
                  <div style={miniStatValueStyle}>99.99%</div>
                </div>
                <div style={miniStatStyle}>
                  <div style={miniStatLabelStyle}>Latency</div>
                  <div style={miniStatValueStyle}>~120ms</div>
                </div>
                <div style={miniStatStyle}>
                  <div style={miniStatLabelStyle}>Support</div>
                  <div style={miniStatValueStyle}>Fast help</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ padding: "6px 20px 28px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <div style={{ color: "#64748B", fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
              Trusted by Kenyan businesses
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              {[
                {
                  name: "Wanjiku Traders (Nairobi)",
                  role: "Retail shop owner",
                  quote:
                    "posifypro made it easy to track stock and see daily sales. I stopped guessing—now reports are clear.",
                },
                {
                  name: "Kiprotich Hardware (Eldoret)",
                  role: "Store manager",
                  quote:
                    "Checkout is faster, and inventory updates automatically. We reduced losses from miscounting.",
                },
                {
                  name: "Otieno Pharmacy (Kisumu)",
                  role: "Operations lead",
                  quote:
                    "The system keeps our transactions organized. It’s simple enough for staff and reliable for the business.",
                },
                {
                  name: "Mwende Salon (Mombasa)",
                  role: "Salon owner",
                  quote:
                    "We track bookings and daily sales in one place. The one-time payment was a great decision for us.",
                },
                {
                  name: "Abdul’s Fast Foods (Nakuru)",
                  role: "Restaurant manager",
                  quote:
                    "POS is smooth, and the reports help us plan purchasing better. Our team adopted it quickly.",
                },
                {
                  name: "Benson Auto Parts (Thika)",
                  role: "Spare parts shop",
                  quote:
                    "Inventory alerts are a lifesaver. We reorder before customers start asking for items.",
                },
              ].map((t) => (
                <div key={t.name} style={testimonialCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={avatarStyle}>{t.name.split(" ")[0].slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 950, color: "#0F172A", fontSize: 14 }}>{t.name}</div>
                      <div style={{ color: "#64748B", fontSize: 12, fontWeight: 800 }}>{t.role}</div>
                    </div>
                  </div>
                  <div style={{ color: "#334155", lineHeight: 1.7, fontSize: 14 }}>{t.quote}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: "10px 20px 10px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <h2 style={h2Style}>Everything you need to run smoothly.</h2>
            <p style={subStyle}>
              Sales, inventory, and reporting designed for day-to-day operations—so you spend less time on paperwork.
            </p>

            <div style={grid3Style}>
              {[
                { title: "Fast checkout", desc: "Issue receipts quickly and keep transactions organized across your store.", icon: "⚡" },
                { title: "Inventory tracking", desc: "Know stock levels in real time and spot low stock when it matters.", icon: "📦" },
                { title: "Clear reports", desc: "Track daily and monthly performance to make confident business decisions.", icon: "📈" },
              ].map((f) => (
                <div key={f.title} style={cardStyle}>
                  <div style={iconStyle}>{f.icon}</div>
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ color: "#475569", lineHeight: 1.6, fontSize: 14 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" style={{ padding: "26px 20px 10px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <h2 style={h2Style}>Simple steps. Real business impact.</h2>
            <p style={subStyle}>Start with a free trial, then pay a one-time license fee to keep using posifypro.</p>

            <div style={grid3Style}>
              {[
                { step: "01", title: "Start the trial", desc: "Create your workspace and try sales, inventory, and reports." },
                { step: "02", title: "Use the POS", desc: "Test the flow in your shop setup—no monthly subscription during trial." },
                { step: "03", title: "Pay once, keep going", desc: "After trial, choose a one-time license plan." },
              ].map((s) => (
                <div key={s.step} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ fontWeight: 1000, fontSize: 14, color: "#1D4ED8" }}>{s.step}</div>
                    <div style={dotStyle} />
                  </div>
                  <div style={{ fontWeight: 950, marginTop: 8, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ color: "#475569", lineHeight: 1.6, fontSize: 14 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: "26px 20px 64px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <h2 style={h2Style}>One-time pricing that fits your budget.</h2>
            <p style={subStyle}>Pay once and run posifypro with confidence—made for Kenyan businesses.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                {
                  name: "Starter",
                  price: "KSh 0",
                  note: "trial",
                  badge: "Try it free",
                  bullets: ["Basic POS checkout", "Inventory tracking", "Standard reports"],
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "KSh 15,000",
                  note: "one-time license",
                  badge: "Best for growing shops",
                  bullets: ["Everything in Starter", "Advanced reporting", "Low-stock alerts"],
                  highlight: true,
                },
                {
                  name: "Business",
                  price: "KSh 35,000",
                  note: "one-time license",
                  badge: "For multiple staff",
                  bullets: ["Everything in Pro", "Role-based access", "Priority onboarding"],
                  highlight: false,
                },
              ].map((p) => (
                <div
                  key={p.name}
                  style={{
                    ...cardStyle,
                    borderColor: p.highlight ? "rgba(29, 78, 216, 0.30)" : cardBorder,
                    boxShadow: p.highlight ? "0 30px 80px rgba(29, 78, 216, 0.12)" : undefined,
                    transform: p.highlight ? "translateY(-4px)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>{p.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `1px solid ${
                          p.highlight ? "rgba(29, 78, 216, 0.30)" : "rgba(15, 23, 42, 0.10)"
                        }`,
                        background: p.highlight ? "rgba(29, 78, 216, 0.10)" : "#FFFFFF",
                        color: p.highlight ? "#1D4ED8" : "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.badge}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 36, fontWeight: 1000, letterSpacing: "-0.03em" }}>{p.price}</div>
                    <div style={{ color: "#64748B", fontWeight: 800, fontSize: 13 }}>{p.note}</div>
                  </div>

                  <ul style={{ margin: "14px 0 0", paddingLeft: 18, color: "#475569", lineHeight: 1.7, fontSize: 14 }}>
                    {p.bullets.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>

                  <div style={{ marginTop: 16 }}>
                    <a href="/login" style={p.highlight ? primaryBtnStyle : secondaryBtnStyle}>
                      Start free trial
                    </a>
                  </div>

                  <div style={{ marginTop: 10, color: "#64748B", fontSize: 12, fontWeight: 750 }}>
                    {p.name === "Starter" ? "Test posifypro and upgrade when you're ready." : "Pay once—no monthly subscription requirement."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: "0 20px 70px" }}>
          <div style={{ maxWidth: 1120, margin: "0 auto" }}>
            <h2 style={h2Style}>Frequently asked questions</h2>
            <p style={subStyle}>Quick answers for common questions.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                {
                  q: "Is posifypro a subscription?",
                  a: "After your free trial, the plans are one-time license payments (no recurring subscription requirement).",
                },
                {
                  q: "What happens after the trial?",
                  a: "You can choose a plan and pay a one-time license fee to keep using the system.",
                },
                {
                  q: "Do I need a license to use the dashboard?",
                  a: "During the trial you can use the features. After the trial, activation is handled via your chosen one-time plan.",
                },
                {
                  q: "Can I cancel?",
                  a: "Since pricing is one-time, there are no ongoing monthly charges to cancel. You can decide to stay on the platform after payment.",
                },
              ].map((item) => (
                <details
                  key={item.q}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                    background: "#FFFFFF",
                    padding: 14,
                  }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 950, color: "#0F172A" }}>{item.q}</summary>
                  <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.6, fontSize: 14, fontWeight: 650 }}>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid rgba(15, 23, 42, 0.08)", background: "#FFFFFF" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "22px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "#64748B", fontSize: 13, fontWeight: 750 }}>
            © {new Date().getFullYear()} posifypro. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#features" style={linkStyle}>
              Features
            </a>
            <a href="#pricing" style={linkStyle}>
              Pricing
            </a>
            <a href="/login" style={ghostBtnStyle}>
              Start free trial
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const cardBorder = "rgba(15, 23, 42, 0.10)";

const linkStyle: React.CSSProperties = {
  color: "#334155",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

const heroCardStyle: React.CSSProperties = {
  borderRadius: 20,
  background: "#FFFFFF",
  border: "1px solid rgba(15, 23, 42, 0.10)",
  boxShadow: "0 22px 55px rgba(15, 23, 42, 0.10)",
  overflow: "hidden",
};

const heroCardTopStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
  background: "linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const heroBadgeStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: "rgba(37, 99, 235, 0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 1000,
  color: "#1D4ED8",
};

const heroCardBottomStyle: React.CSSProperties = {
  padding: 14,
  borderTop: "1px solid rgba(15, 23, 42, 0.08)",
  background: "#FAFBFF",
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const metricRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 0",
  borderBottom: "1px dashed rgba(15, 23, 42, 0.10)",
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#64748B",
  fontWeight: 850,
};

const metricValueStyle: React.CSSProperties = {
  fontWeight: 1000,
  letterSpacing: "-0.03em",
  fontSize: 20,
};

const recommendationStyle: React.CSSProperties = {
  marginTop: 14,
  borderRadius: 16,
  background: "rgba(37, 99, 235, 0.04)",
  border: "1px solid rgba(37, 99, 235, 0.12)",
  padding: 14,
};

const miniStatStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 90,
};

const miniStatLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748B",
  fontWeight: 850,
};

const miniStatValueStyle: React.CSSProperties = {
  fontWeight: 1000,
  letterSpacing: "-0.03em",
};

const testimonialCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(15, 23, 42, 0.10)",
  background: "#FFFFFF",
  padding: 16,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
};

const avatarStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  background: "rgba(37, 99, 235, 0.10)",
  border: "1px solid rgba(37, 99, 235, 0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 1000,
  color: "#1D4ED8",
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: cardBorder,
  background: "#FFFFFF",
  padding: 16,
};

const iconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  background: "rgba(37, 99, 235, 0.10)",
  border: "1px solid rgba(37, 99, 235, 0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  marginBottom: 10,
};

const grid3Style: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 14,
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #2563EB, #60A5FA)",
  color: "#FFFFFF",
  textDecoration: "none",
  fontWeight: 950,
  boxShadow: "0 18px 40px rgba(37, 99, 235, 0.20)",
  border: "1px solid rgba(37, 99, 235, 0.35)",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#FFFFFF",
  color: "#1D4ED8",
  textDecoration: "none",
  fontWeight: 950,
  border: "1px solid rgba(29, 78, 216, 0.30)",
};

const tertiaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  borderRadius: 12,
  background: "#FFFFFF",
  color: "#1D4ED8",
  textDecoration: "none",
  fontWeight: 950,
  border: "1px solid rgba(29, 78, 216, 0.22)",
};

const ghostBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  borderRadius: 12,
  background: "transparent",
  color: "#334155",
  textDecoration: "none",
  fontWeight: 950,
  border: "1px solid rgba(15, 23, 42, 0.10)",
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(15, 23, 42, 0.10)",
  background: "#FFFFFF",
  color: "#334155",
  fontWeight: 900,
  fontSize: 13,
};

const checkStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  background: "rgba(29, 78, 216, 0.12)",
  border: "1px solid rgba(29, 78, 216, 0.22)",
};

const dotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  background: "rgba(29, 78, 216, 0.18)",
  border: "1px solid rgba(29, 78, 216, 0.25)",
};

const h2Style: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 28,
  lineHeight: 1.15,
  letterSpacing: "-0.03em",
};

const subStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.65,
  maxWidth: 760,
};
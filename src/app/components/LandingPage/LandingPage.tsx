'use client';

import React, { useState, useEffect } from 'react';
import styles from './LandingPage.module.css';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faEnvelope,
    faStickyNote,
    faHeadset,
    faVideo,
    faCalendarCheck,
    faCheck,
    faBars,
    faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

interface LandingPageProps {
    user: any;
}

export default function LandingPage({ user }: LandingPageProps) {
    const router = useRouter();
    const [notificationIndex, setNotificationIndex] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setNotificationIndex((prev) => (prev + 1) % 2);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const getDiscountedPrice = (price: string) => {
        const numPrice = parseInt(price);
        return billingCycle === 'yearly' ? Math.round(numPrice * 0.8) : numPrice;
    };

    const handleLogin = () => {
        router.push('/login');
    };

    const handleSignup = () => {
        router.push('/register');
    };

    const handleDashboard = () => {
        router.push('/dashboard');
    };

    const products = [
        { name: 'Email Integration', icon: faEnvelope, color: '#EA4335' },
        { name: 'Smart Notes', icon: faStickyNote, color: '#FBBC04' },
        { name: 'WhatsApp Business', icon: faWhatsapp, color: '#25D366' },
        { name: 'VoIP Calling', icon: faHeadset, color: '#4285F4' },
        { name: 'HD Meetings', icon: faVideo, color: '#EA4335' },
        { name: 'Appointments', icon: faCalendarCheck, color: '#34A853' },
    ];

    const pricingPlans = [
        {
            name: 'Basic',
            price: '99',
            period: 'month',
            description: 'Perfect for Startups & small teams',
            features: [
                'Admin + 2 Users included',
                'Core CRM Essentials',
                'Email Sync',
                'Lead & Contact Management',
                'Task Management',
                '5 GB Storage'
            ],
            buttonText: 'Start Free Trial',
            buttonStyle: 'secondary',
            popular: false
        },
        {
            name: 'Pro',
            price: '499',
            period: 'month',
            description: 'Growing businesses & sales teams',
            features: [
                'Admin + 5 Users included',
                'Everything in Basic',
                'Ticket Management',
                'Appointment Scheduling',
                'Feedback Management',
                '10 GB Storage'
            ],
            buttonText: 'Start Free Trial',
            buttonStyle: 'primary',
            popular: true
        },
        {
            name: 'Enterprise',
            price: '999',
            period: 'month',
            description: 'Enterprises & multi-team orgs',
            features: [
                'Admin + 10 Users included',
                'Everything in Pro',
                'Custom Workflows',
                'Advanced Reporting',
                'Priority Support',
                '15 GB Storage'
            ],
            buttonText: 'Contact Sales',
            buttonStyle: 'secondary',
            popular: false
        }
    ];

    const testimonials = [
        {
            content: "This CRM has completely transformed how we manage our business. The VoIP calling and WhatsApp integration are game-changers for our sales team.",
            author: "Rajesh Kumar",
            role: "Sales Director, TechVentures",
            avatar: "https://i.pravatar.cc/150?u=rajesh"
        },
        {
            content: "The appointment scheduling and task management features have streamlined our operations. We can now focus more on growing our business.",
            author: "Priya Sharma",
            role: "Operations Manager, GrowthHub",
            avatar: "https://i.pravatar.cc/150?u=priya"
        },
        {
            content: "Highly recommended for any business looking to streamline their workflow and increase productivity. The product and service management is excellent.",
            author: "Amit Patel",
            role: "CEO, InnovateCo",
            avatar: "https://i.pravatar.cc/150?u=amit"
        }
    ];

    const blogs = [
        {
            title: "5 Tips for Managing Customer Relationships Effectively",
            excerpt: "Learn how to organize your CRM workspace to boost sales and improve customer satisfaction.",
            date: "Oct 12, 2025",
            image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "The Future of CRM: AI and Automation",
            excerpt: "Discover how AI tools are reshaping customer relationship management and what it means for your business.",
            date: "Sep 28, 2025",
            image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=800&q=80"
        },
        {
            title: "Customer Communication Best Practices",
            excerpt: "Master the art of customer communication with these essential tips for modern businesses.",
            date: "Sep 15, 2025",
            image: "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&w=800&q=80"
        }
    ];

    return (
        <div className={styles.container}>
            {/* Notification Bar */}
            <div
                className={styles.notificationBar}
                style={{
                    backgroundImage: 'url("/themes/Group 3.png")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: 'white'
                }}
            >
                {notificationIndex === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 0.5s', height: '28px' }}>
                        <span style={{ lineHeight: '1' }}>Start your free trial today!</span>
                        <button className={styles.buyButton} onClick={handleSignup}>Get Started</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: 'fadeIn 0.5s', height: '28px' }}>
                        <img
                            src="https://img.icons8.com/ios-glyphs/50/chatgpt.png"
                            alt="AI"
                            width={20}
                            height={20}
                            style={{ filter: 'brightness(0) invert(1)' }}
                        />
                        <span style={{ lineHeight: '1' }}>ChatGPT Integration coming soon</span>
                        <span className={styles.trialPill}>Coming Soon</span>
                    </div>
                )}
            </div>

            {/* Navbar */}
            <nav className={styles.navbar}>
                <div className={styles.logo}>
                    <img src="/omo.jpg" alt="OMO CRM" style={{ height: '46px', width: 'auto' }} />
                </div>

                <div className={styles.navLinks}>
                    <div className={styles.navLink} onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}>Home</div>
                    <div className={styles.navLink} onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Products</div>
                    <div className={styles.navLink} onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</div>
                    <div className={styles.navLink} onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Testimonials</div>
                    <div className={styles.navLink} onClick={() => document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' })}>Insights</div>
                    <div className={styles.navLink} onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Contact Us</div>
                </div>

                <div className={styles.navButtons}>
                    {user ? (
                        <button className={styles.signupBtn} onClick={handleDashboard}>
                            Go to Dashboard
                        </button>
                    ) : (
                        <>
                            <button className={styles.loginBtn} onClick={handleLogin}>
                                Log in
                            </button>
                            <button className={styles.signupBtn} onClick={handleSignup}>
                                Start Free Trial
                            </button>
                        </>
                    )}
                </div>

                {/* Hamburger Menu Button */}
                <button
                    className={styles.hamburger}
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <i className="fa-sharp fa-thin fa-bars"></i>
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    <div className={styles.mobileMenuContent}>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Home</div>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Products</div>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Pricing</div>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Testimonials</div>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Insights</div>
                        <div className={styles.mobileNavLink} onClick={() => {
                            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}>Contact Us</div>

                        <div className={styles.mobileMenuButtons}>
                            {user ? (
                                <button className={styles.signupBtn} onClick={() => {
                                    handleDashboard();
                                    setMobileMenuOpen(false);
                                }}>
                                    Go to Dashboard
                                </button>
                            ) : (
                                <>
                                    <button className={styles.loginBtn} onClick={() => {
                                        handleLogin();
                                        setMobileMenuOpen(false);
                                    }}>
                                        Log in
                                    </button>
                                    <button className={styles.signupBtn} onClick={() => {
                                        handleSignup();
                                        setMobileMenuOpen(false);
                                    }}>
                                        Start Free Trial
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section id="hero" className={styles.hero}>
                {/* Floating Background Icons */}
                <div className={styles.heroBackgroundIcons}>
                    <img src="/footer/plus2.svg" alt="" className={styles.floatingIcon} style={{ top: '15%', left: '8%', width: '60px', animationDelay: '0s' }} />
                    <img src="/footer/square stretch2.svg" alt="" className={styles.floatingIcon} style={{ top: '25%', right: '12%', width: '70px', animationDelay: '1s' }} />
                    <img src="/footer/triangle pair.svg" alt="" className={styles.floatingIcon} style={{ bottom: '20%', left: '15%', width: '65px', animationDelay: '2s' }} />
                    <img src="/footer/triangle pair1.svg" alt="" className={styles.floatingIcon} style={{ bottom: '30%', right: '10%', width: '55px', animationDelay: '1.5s' }} />
                </div>

                <div className={styles.heroBadge}>
                    <FontAwesomeIcon icon={faBolt} style={{ marginRight: '8px' }} />
                    All-in-One CRM for Modern Businesses
                </div>
                <h1 className={styles.heroTitle}>
                    Manage <span className={styles.titlePill}><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80" alt="Team" /></span> Customers, <br />
                    Grow <span className={styles.titlePill}><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" alt="Business" /></span> <span className={styles.gradientText}>Business Faster</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    The all-in-one CRM built for modern businesses. Manage contacts, schedule appointments, communicate via WhatsApp & VoIP, and track everything in one place.
                </p>
                <div className={styles.heroButtons}>
                    {user ? (
                        <button className={styles.primaryBtn} onClick={handleDashboard}>
                            Enter Dashboard
                        </button>
                    ) : (
                        <>
                            <button className={styles.primaryBtn} onClick={handleSignup}>
                                Get Started Free
                            </button>
                            <button className={styles.secondaryBtn} onClick={() => { }}>
                                Access Dashboard
                            </button>
                        </>
                    )}
                </div>
            </section>

            {/* Our Products Section */}
            <section id="products" className={styles.productsSection}>
                <div className={styles.productsHeader}>
                    <h2 className={styles.sectionTitle}>Our Products</h2>
                    <p className={styles.sectionSubtitle}>
                        Everything you need to manage your client relationships effectively.
                    </p>
                </div>

                <div className={styles.productsContainer}>
                    {/* Left Side: Abstract 3D Icons */}
                    <div className={styles.productImages}>
                        <img src="/icons-products/mem_donut.svg" alt="" className={styles.productImageItem} style={{ marginTop: '0', marginLeft: '10%' }} />
                        <img src="/icons-products/mem_3d_arrow.svg" alt="" className={styles.productImageItem} style={{ marginTop: '80px' }} />
                        <img src="/icons-products/mem_st_fill_circle.svg" alt="" className={styles.productImageItem} style={{ marginTop: '-40px', marginLeft: '20px' }} />
                        <img src="/icons-products/mem_blocks.svg" alt="" className={styles.productImageItem} style={{ marginTop: '40px' }} />
                        <img src="/icons-products/mem_pyra.svg" alt="" className={styles.productImageItem} style={{ marginTop: '-20px', marginLeft: '30px' }} />
                        <img src="/icons-products/mem_3d_block2.svg" alt="" className={styles.productImageItem} style={{ marginTop: '60px' }} />
                        <img src="/icons-products/mem_st_fill_triangle.svg" alt="" className={styles.productImageItem} style={{ marginTop: '-50px', marginRight: '20px' }} />
                        <img src="/icons-products/mem_ot_semi_circle.svg" alt="" className={styles.productImageItem} style={{ marginTop: '30px' }} />
                    </div>

                    {/* Right Side: Product List */}
                    <div className={styles.productList}>
                        <img src="/dashboard-preview.png" alt="Dashboard Preview" className={styles.dashboardPreviewImage} />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className={styles.pricingSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
                    <p className={styles.sectionSubtitle}>
                        Choose the plan that fits your practice size and needs.
                    </p>

                    {/* Billing Toggle */}
                    <div className={styles.billingToggle}>
                        <button
                            className={`${styles.toggleButton} ${billingCycle === 'monthly' ? styles.active : ''}`}
                            onClick={() => setBillingCycle('monthly')}
                        >
                            Monthly
                        </button>
                        <button
                            className={`${styles.toggleButton} ${billingCycle === 'yearly' ? styles.active : ''}`}
                            onClick={() => setBillingCycle('yearly')}
                        >
                            Yearly
                        </button>
                    </div>
                </div>

                <div className={styles.pricingGrid}>
                    {pricingPlans.map((plan, index) => (
                        <div key={index} className={`${styles.pricingCard} ${plan.popular ? styles.popular : ''}`}>
                            {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                            <div className={styles.pricingHeader}>
                                <h3 className={styles.planName} style={{ fontSize: '1.3rem', fontFamily: "'Open Sauce One', sans-serif" }}>{plan.name}</h3>
                                <div className={styles.pricingPrice}>
                                    <span>₹</span>
                                    <span>{getDiscountedPrice(plan.price)}</span>
                                    <span className={styles.pricingPeriod}>/{plan.period}</span>
                                </div>
                                <p style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                            </div>

                            <div className={styles.pricingFeatures}>
                                <ul>
                                    {plan.features.map((feature, i) => (
                                        <li key={i}>
                                            <i className="fa-sharp fa-thin fa-check" style={{ color: '#11a454', marginRight: '10px', fontSize: '1.1rem' }} />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button className={`${styles.pricingBtn} ${plan.buttonStyle === 'primary' ? styles.primary : styles.secondary}`}>
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className={styles.testimonialsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Loved by Professionals</h2>
                    <p className={styles.sectionSubtitle}>Here's what our users have to say.</p>
                </div>
                <div className={styles.testimonialScrollContainer}>
                    <div className={styles.testimonialTrack}>
                        {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
                            <div key={index} className={styles.testimonialCard}>
                                <p className={styles.testimonialContent}>"{testimonial.content}"</p>
                                <div className={styles.testimonialAuthor}>
                                    <img src={testimonial.avatar} alt={testimonial.author} className={styles.testimonialAvatar} />
                                    <div className={styles.authorInfo}>
                                        <h4>{testimonial.author}</h4>
                                        <p>{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Blogs Section */}
            <section id="insights" className={styles.blogsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Latest Insights</h2>
                    <p className={styles.sectionSubtitle}>Stay updated with the latest trends in CRM and business growth.</p>
                </div>
                <div className={styles.blogsGrid}>
                    {blogs.map((blog, index) => (
                        <div key={index} className={styles.blogCard}>
                            <img src={blog.image} alt={blog.title} className={styles.blogImage} />
                            <div className={styles.blogContent}>
                                <span className={styles.blogDate}>{blog.date}</span>
                                <h3 className={styles.blogTitle}>{blog.title}</h3>
                                <p className={styles.blogExcerpt}>{blog.excerpt}</p>
                                <a href="#" className={styles.readMoreBtn}>Read more <i className="fa-sharp fa-thin fa-arrow-right" style={{ fontSize: '0.8rem', marginLeft: '5px' }} /></a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className={styles.contactSection}>
                <div className={styles.contactContainer}>

                    <div className={styles.contactRight}>
                        <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '1.5rem' }}>Get in Touch</h2>
                        <form className={styles.contactForm}>
                            <div className={styles.formRow}>
                                <div className={styles.inputGroup}>
                                    <label>First name *</label>
                                    <input type="text" className={styles.inputField} required />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Last name *</label>
                                    <input type="text" className={styles.inputField} required />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Work Email Only *</label>
                                <input type="email" className={styles.inputField} required />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Company *</label>
                                <input type="text" className={styles.inputField} required />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Job title *</label>
                                <input type="text" className={styles.inputField} required />
                            </div>



                            <div className={styles.inputGroup}>
                                <label>Country *</label>
                                <select className={styles.inputField} required>
                                    <option value="India">India</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    {/* Add more countries as needed */}
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Phone *</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="text" className={styles.inputField} defaultValue="+ 1" style={{ width: '80px', textAlign: 'center' }} readOnly />
                                    <input type="tel" className={styles.inputField} placeholder="1234567890" required />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Your message to us *</label>
                                <textarea className={styles.inputField} rows={4} style={{ resize: 'none' }} required></textarea>
                            </div>

                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" />
                                    <span style={{ fontWeight: '300' }}>Connect me with an expert! I’d like to get more information about Consolegal products or see a custom demo. *</span>
                                </label>
                            </div>

                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" />
                                    <span style={{ fontWeight: '300' }}>Sign me up for news from Consolegal (products, services, blogs, and events). I can update my preferences or unsubscribe at any time.</span>
                                </label>
                            </div>

                            <p className={styles.legalDisclaimer}>
                                By submitting this form you agree to our privacy policy. For more information on how your personal data will be processed, please read our privacy statement. We will not share your information with third parties.
                            </p>

                            <button type="submit" className={styles.submitBtn}>Send Message</button>
                        </form>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className={styles.faqSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
                    <p className={styles.sectionSubtitle}>Find answers to common questions about our CRM.</p>
                </div>

                <div className={styles.faqContainer}>
                    <div className={styles.faqSearchContainer}>
                        <FontAwesomeIcon icon={faArrowRight} className={styles.faqSearchIcon} style={{ transform: 'none', color: '#888' }} /> {/* Reusing arrow just as placeholder icon if search not avail, actually let's use a simpler icon approach or just text input */}
                        {/* Better to import faSearch, but let's stick to simple input for now or reuse existing icons */}
                        <input
                            type="text"
                            className={styles.faqSearchInput}
                            placeholder="Search questions..."
                            onChange={(e) => {
                                const term = e.target.value.toLowerCase();
                                const items = document.querySelectorAll(`.${styles.faqItem}`);
                                items.forEach((item) => {
                                    const question = item.querySelector(`.${styles.faqQuestion}`)?.textContent?.toLowerCase() || '';
                                    if (question.includes(term)) {
                                        (item as HTMLElement).style.display = 'block';
                                    } else {
                                        (item as HTMLElement).style.display = 'none';
                                    }
                                });
                            }}
                        />
                    </div>

                    <div className={styles.faqGrid}>
                        {[
                            { q: "Can I cancel my subscription anytime?", a: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. Your data will be preserved for 30 days after cancellation." },
                            { q: "Is there a free trial available?", a: "Absolutely! We offer a 14-day free trial on all paid plans so you can explore the features before committing. No credit card required to start." },
                            { q: "How secure is my customer data?", a: "We use enterprise-grade 256-bit SSL encryption to keep your data safe. We are compliant with industry standards and perform regular security audits." },
                            { q: "Can I import my existing contacts?", a: "Yes, our CRM offers easy import tools for CSV and Excel files. You can migrate your customer database in just a few clicks." },
                            { q: "Does it integrate with Outlook/Gmail?", a: "Yes, we have native integrations for both Gmail and Outlook. Emails are automatically synced to respective customer profiles." },
                            { q: "Is the mobile app included?", a: "Yes, the mobile app is available for both iOS and Android and is included with all subscription plans, allowing you to manage your business on the go." },
                            { q: "How does the WhatsApp integration work?", a: "You can connect your WhatsApp Business API or scan a QR code. Messages sync directly to customer profiles, allowing you to chat without leaving the CRM." },
                            { q: "Do you offer training/onboarding?", a: "We provide comprehensive video tutorials, documentation, and live webinars. Enterprise plans include dedicated onboarding specialists." },
                            { q: "Can I customize the dashboard?", a: "Yes, the dashboard is modular. You can pin your most-used widgets like Calendar, Tasks, Meetings, or Recent Activities to the top for easy access." },
                            { q: "What methods of payment do you accept?", a: "We accept all major credit cards (Visa, Mastercard, Amex), UPI, and net banking. For Enterprise plans, invoice-based billing is available." },
                        ].map((faq, index) => (
                            <div key={index} className={styles.faqItem} onClick={(e) => {
                                const currentTarget = e.currentTarget;
                                currentTarget.classList.toggle(styles.active);
                                const answer = currentTarget.querySelector(`.${styles.faqAnswerWrapper}`) as HTMLElement;
                                if (currentTarget.classList.contains(styles.active)) {
                                    answer.style.height = answer.scrollHeight + 'px';
                                } else {
                                    answer.style.height = '0';
                                }
                            }}>
                                <div className={styles.faqHeader}>
                                    <h3 className={styles.faqQuestion}>{faq.q}</h3>
                                    <i className={`fa-sharp fa-thin fa-arrow-down ${styles.faqToggleIcon}`} />
                                </div>
                                <div className={styles.faqAnswerWrapper}>
                                    <div className={styles.faqAnswer}>
                                        {faq.a}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerContent}>
                    <div className={styles.footerBrand}>
                        <div className={styles.logo}>
                            <img src="/omo-transparent.png" alt="OMO CRM" style={{ height: '70px', width: 'auto' }} />
                        </div>
                        <div className={styles.contactInfo}>

                            <p>C 32/22, B 1/3, Vidyapeeth Rd, Annapurna Nagar Colony, Varanasi, Uttar Pradesh 221002</p>
                            <p>+91 98342 25937</p>
                            <p>support@omodigital.io</p>
                        </div>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Product</h4>
                        <ul>
                            <li><a href="#">Email</a></li>
                            <li><a href="#">Notes</a></li>
                            <li><a href="#">WhatsApp</a></li>
                            <li><a href="#">VoIP</a></li>
                        </ul>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Documentation</h4>
                        <ul>
                            <li><a href="#">Help Center<i className="fa-sharp fa-thin fa-arrow-up-right" style={{ marginLeft: '0.5rem' }}></i></a></li>
                            <li><a href="#">API Reference<i className="fa-sharp fa-thin fa-arrow-up-right" style={{ marginLeft: '0.5rem' }}></i></a></li>
                            <li><a href="#">System Status<i className="fa-sharp fa-thin fa-arrow-up-right" style={{ marginLeft: '0.5rem' }}></i></a></li>
                            <li><a href="#">Changelog<i className="fa-sharp fa-thin fa-arrow-up-right" style={{ marginLeft: '0.5rem' }}></i></a></li>
                        </ul>
                    </div>

                    <div className={styles.footerCol}>
                        <h4>Connect</h4>
                        <button className={styles.talkToExpertBtn}>Talk to Expert</button>
                        <div className={styles.socialGrid}>
                            <a href="#"><img width="40" height="40" src="https://img.icons8.com/ios/50/facebook-new.png" alt="facebook-new" /></a>
                            <a href="#"><img width="40" height="40" src="https://img.icons8.com/ios/50/twitterx--v2.png" alt="twitterx--v2" /></a>
                            <a href="#"><img width="40" height="40" src="https://img.icons8.com/ios/50/linkedin.png" alt="linkedin" /></a>
                            <a href="#"><img width="40" height="40" src="https://img.icons8.com/ios/50/instagram-new--v1.png" alt="instagram-new--v1" /></a>
                        </div>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <div className={styles.footerCopyright}>
                        © {new Date().getFullYear()} Omo CRM. All rights reserved.
                    </div>
                    <div className={styles.footerBottomLinks}>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Cookies</a>
                        <a href="#">Refunds</a>
                        <a href="#">Terms & Conditions</a>
                    </div>
                </div>
            </footer>
            {/* WhatsApp FAB */}
            <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className={styles.whatsappFab}>
                <FontAwesomeIcon icon={faWhatsapp} />
            </a>
        </div>
    );
}

// Home.tsx
import React from 'react';
import heroImage from '../uploads/images/school-children-dressed-uniform-have-fun-play-schoolyard.jpg';

const Home: React.FC = () => {
  return (
    <>
      {/* Hero */}
      <section
        id="home"
        className="hero"
        style={{
          background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.24)), url(${heroImage}) center/cover no-repeat`
        }}
      >
        <div className="section-content">
          <h1>Help Under-Resourced Schools</h1>
          <p>Connecting donors directly with schools in Sri Lanka for transparent, accountable support.</p>
          <button className="btn-primary">Register Your School</button>
        </div>
      </section>

      {/* About */}
      <section id="about" className="about-section">
        <div className="section-content">
          <p className="section-description">
            "Every Child, Every Classroom aims to give children in Sri Lanka the gift of education. 
            We bridge the gap between donors and schools to create brighter, more equal opportunities for learning."
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works">
        <div className="section-content">
          <h2 className="section-title">How It Works</h2>
          <div className="cards">
            <div className="card"><h3>1. Choose a School</h3><p>Select a school and see its specific needs and funding requirements.</p></div>
            <div className="card"><h3>2. Donate</h3><p>Securely contribute funds or supplies directly through our platform.</p></div>
            <div className="card"><h3>3. Track Impact</h3><p>Receive updates and proof of how your donation is making a difference.</p></div>
          </div>
        </div>
      </section>

      {/* Donate */}
      <section id="donate">
        <div className="section-content text-center">
          <h2 className="section-title">Make a Donation</h2>
          <p>Your support makes a real difference. Choose a project or give to general funds.</p>
          <button className="btn-primary">Donate Now</button>
        </div>
      </section>

      {/* Impact */}
      <section id="impact">
        <div className="section-content">
          <h2 className="section-title text-center">Impact & Success Stories</h2>
          <div className="cards">
            {[
              { title: 'Student Scholarship', desc: '100 students received scholarships last year.' },
              { title: 'Classroom Renovation', desc: '5 schools improved learning environments with your help.' },
              { title: 'Digital Learning', desc: 'Equipped 200 students with computers and tablets.' }
            ].map((item, idx) => (
              <div key={idx} className="card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog */}
      <section id="blog">
        <div className="section-content">
          <h2 className="section-title text-center">Latest Updates</h2>
          <div className="cards">
            {[
              { title: 'Back to School Drive', desc: 'Updates on our annual back-to-school campaign.' },
              { title: 'Volunteer Stories', desc: 'Read inspiring experiences from our volunteers.' }
            ].map((post, idx) => (
              <div key={idx} className="card">
                <h3>{post.title}</h3>
                <p>{post.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="contact-section">
        <div className="section-content">
          <h2 className="section-title text-center">Contact Us</h2>
          <form className="contact-form" method="POST" action="send_message.php">
            <input type="text" name="name" placeholder="Your Name" required />
            <input type="email" name="email" placeholder="Your Email" required />
            <textarea name="message" rows={5} placeholder="Your Message" required></textarea>
            <button type="submit">Send Message</button>
          </form>
        </div>
      </section>
    </>
  );
};

export default Home;

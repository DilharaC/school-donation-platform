import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

interface Project {
  request_id: number;
  school_id: number;
  request_title: string;
  category: string;
  quantity: number;
  estimated_price: number;
  amount_raised: number;
  description: string;
  image_url?: string;
  document_url?: string;
  status: string;
  school_name: string;
}

interface ProjectsProps {
  // currentUser: any;
}

const categories = ["All", "Technology", "Books", "Infrastructure", "Furniture", "Arts", "Sports"];


const Projects: React.FC<ProjectsProps> = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const projectsPerPage = 6;

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/api/donation_requests", {
        params: { search, category, page, limit: projectsPerPage },
      });
      setProjects(response.data.projects || []);
      setTotalPages(Math.ceil((response.data.total || 0) / projectsPerPage));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, category, page]);

  const handleCategoryClick = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const calculatePercent = (raised: number, goal: number) => {
    if (goal <= 0) return 0;
    return Math.min(100, (raised / goal) * 100);
  };

  return (
    <div style={{ width: "90%", maxWidth: "1400px", margin: "2rem auto" }}>
      {/* Hero Section */}
      <section
        className="hero"
        style={{
          textAlign: "center",
          marginBottom: "2rem",
          height: "40vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1>Explore Projects</h1>
        <p>Support rural schools by donating to projects that address their specific needs.</p>
        <div className="search-bar" style={{ width: "50%", margin: "1rem auto" }}>
          <input
            type="text"
            placeholder="Search projects by keyword, school, or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "25px",
              border: "1px solid #ddd",
              fontSize: "1rem",
            }}
          />
        </div>
      </section>

      {/* Categories Filter */}
      <div
        className="filters"
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "0.8rem",
          marginBottom: "2rem",
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={cat === category ? "active" : ""}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "20px",
              border: "1px solid #ddd",
              background: cat === category ? "#e63946" : "#fff",
              color: cat === category ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.9rem",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <p style={{ textAlign: "center", margin: "2rem 0" }}>Loading projects...</p>}

      {/* Projects Grid */}
      <section
        className="projects"
        style={{
          display: "flex",
          width: "1100px",
          margin: "auto",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {projects.map((proj) => {
          const percent = calculatePercent(proj.amount_raised, proj.estimated_price);

          return (
            <div
              key={proj.request_id}
              style={{
                display: "flex",
                background: "#fff",
                borderRadius: "15px",
                padding: "1.2rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                gap: "1.5rem",
                alignItems: "flex-start",
                height: "260px",
              }}
            >
              <img
                src={proj.image_url || "https://via.placeholder.com/350x220?text=No+Image"}
                alt={proj.request_title}
                style={{
                  width: "350px",
                  height: "220px",
                  borderRadius: "10px",
                  objectFit: "cover",
                }}
              />

              <div style={{ flex: 1 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.3rem 0.8rem",
                    borderRadius: "5px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    background: "#e3eaff",
                    color: "#3b82f6",
                    marginBottom: "0.6rem",
                  }}
                >
                  {proj.category.toUpperCase()}
                </span>

                <h3 style={{ marginBottom: "0.5rem", fontSize: "1.2rem" }}>
                  {proj.request_title} - {proj.school_name}
                </h3>

                <p
                  style={{
                    fontSize: "0.95rem",
                    width: "800px",
                    marginBottom: "0.8rem",
                    lineHeight: "1.4",
                    height: "50px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {proj.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                  }}
                >
                  <span>LKR {proj.amount_raised.toLocaleString()} raised</span>
                  <span>Goal: LKR {proj.estimated_price.toLocaleString()}</span>
                </div>

                <div
                  style={{
                    background: "#eee",
                    borderRadius: "6px",
                    height: "8px",
                    marginBottom: "0.5rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "#e63946",
                      width: `${percent}%`,
                    }}
                  ></div>
                </div>

                <div
                  style={{
                    textAlign: "right",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    marginBottom: "0.8rem",
                  }}
                >
                  {Math.round(percent)}% Funded
                </div>

                <Link
                  to={`/donate/${proj.request_id}`}
                  style={{
                    display: "inline-block",
                    padding: "0.7rem 1.4rem",
                    background: "#e63946",
                    color: "#fff",
                    borderRadius: "25px",
                    textDecoration: "none",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                  }}
                >
                  View Project →
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      {/* Pagination */}
      <div
        className="pagination"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
          margin: "2rem 0",
          flexWrap: "wrap",
        }}
      >
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => setPage(i + 1)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "50%",
              background: page === i + 1 ? "#e63946" : "#fff",
              border: "1px solid #ddd",
              color: page === i + 1 ? "#fff" : "#444",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Projects;

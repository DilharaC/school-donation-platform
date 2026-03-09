# 🎓 School Donation Platform

A transparent and secure **School Donation Platform** that connects **donors, schools, and the education ministry** to support school development projects.
The platform allows schools to request funding, donors to contribute securely, and administrators to verify and manage the entire process.

This system improves **transparency, accountability, and efficiency** in educational donations.

---

# 📌 Project Overview

Many schools require financial assistance for infrastructure, learning materials, and development activities. However, traditional donation methods often lack transparency.

The **School Donation Platform** solves this problem by providing a **digital system where donations can be tracked, verified, and monitored**.

Key objectives:

* Provide a **secure donation system**
* Ensure **transparent fund allocation**
* Allow schools to **request funding easily**
* Enable donors to **track how their donations are used**
* Provide administrators with tools to **monitor and approve requests**

---

# ⚙️ System Features

## 👨‍🎓 Donor Features

* User registration and login
* Browse approved school funding requests
* Make secure online donations
* Choose anonymous donations
* Track donation history
* View evidence of how funds were used
* Receive notifications

## 🏫 School Features

* Register school accounts
* Submit funding requests
* Upload supporting evidence
* Upload spending proof after receiving funds
* Track received donations

## 🏛 Ministry / Admin Features

* Approve or reject school registrations
* Verify school funding requests
* Monitor donation activities
* View system reports and logs
* Maintain system transparency

---

# 🏗 System Architecture

The platform follows a **full-stack architecture**:

Frontend → React (TypeScript)
Backend → Laravel (PHP Framework)
Database → MySQL
Payment Gateway → Stripe

---

# 🧰 Technologies Used

| Technology         | Purpose                   |
| ------------------ | ------------------------- |
| Laravel            | Backend API development   |
| React (TypeScript) | Frontend user interface   |
| MySQL              | Database management       |
| Stripe             | Secure payment processing |
| PHPUnit            | Backend unit testing      |
| Postman            | API testing               |
| GitHub             | Version control           |

---

# 🧪 Testing

The system was tested using multiple testing approaches:

* **Unit Testing** – Backend functions tested using PHPUnit
* **Integration Testing** – API endpoints tested using Postman
* **System Testing** – Full workflow testing through the user interface

Testing ensured that the system operates correctly, securely, and reliably.

---

# 🔐 Security Features

* Authentication using Laravel Sanctum
* Secure password hashing
* CSRF protection
* Secure payment handling via Stripe
* Input validation and error handling

---

# 📂 Project Structure

```
school-donation-platform
│
├── backend (Laravel API)
│   ├── app
│   ├── routes
│   ├── database
│   └── tests
│
├── frontend (React)
│   ├── components
│   ├── pages
│   └── services
│
└── README.md
```

---

# 🚀 How to Run the Project

### 1️⃣ Clone the repository

```
git clone https://github.com/DilharaC/school-donation-platform.git
```

### 2️⃣ Backend Setup (Laravel)

```
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### 3️⃣ Frontend Setup (React)

```
cd frontend
npm install
npm start
```

---

# 📊 Future Improvements

* Mobile application support
* AI-based fraud detection
* School performance analytics
* Multi-language support
* Government integration APIs

---

# 👨‍💻 Author

Developed by **Dilhara**
Final Year Software Engineering Project

---

# 📄 License

This project is developed for **educational and research purposes**.

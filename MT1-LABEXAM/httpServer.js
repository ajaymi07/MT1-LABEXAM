// Part A: HTTP module + FS module (no Express)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory array of books (no database)
const books = [
  { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', price: 350, category: 'Fiction', available: true },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', price: 450, category: 'Self-Help', available: true },
  { id: 3, title: 'Wings of Fire', author: 'A. P. J. Abdul Kalam', price: 300, category: 'Biography', available: false },
  { id: 4, title: 'Clean Code', author: 'Robert C. Martin', price: 550, category: 'Programming', available: true },
  { id: 5, title: 'The Pragmatic Programmer', author: 'Andrew Hunt', price: 620, category: 'Programming', available: false },
  { id: 6, title: 'Sapiens', author: 'Yuval Noah Harari', price: 499, category: 'History', available: true },
  { id: 7, title: 'The Guide', author: 'R. K. Narayan', price: 280, category: 'Fiction', available: true },
  { id: 8, title: 'Deep Work', author: 'Cal Newport', price: 399, category: 'Self-Help', available: false }
];

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

// Helper to send JSON responses
const sendJSON = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', ...CORS });
  res.end(JSON.stringify(data));
};

// Helper to send HTML responses
const sendHTML = (res, statusCode, html) => {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(html);
};

// Read the request body and parse it as JSON
const readJSONBody = (req, res, onSuccess) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      onSuccess(JSON.parse(body));
    } catch (error) {
      sendJSON(res, 400, { error: 'Invalid JSON format' });
    }
  });
};

// Search and availability filtering: /books?search=clean&available=true&category=Programming
const filterBooks = (query) => {
  const search = (query.get('search') || '').trim().toLowerCase();
  const available = query.get('available');
  const category = (query.get('category') || '').trim().toLowerCase();

  return books.filter((book) => {
    const matchesSearch =
      !search || [book.title, book.author, book.category].some((field) => field.toLowerCase().includes(search));
    const matchesAvailability = available === null || available === '' || String(book.available) === available;
    const matchesCategory = !category || book.category.toLowerCase() === category;
    return matchesSearch && matchesAvailability && matchesCategory;
  });
};

const welcomePage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome - Library Book Management</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #eef1f4; color: #12161c; font-family: system-ui, sans-serif; }
    main { max-width: 560px; padding: 32px; }
    h1 { font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.05; margin: 0 0 16px; letter-spacing: -0.02em; }
    p { font-size: 1.1rem; line-height: 1.5; color: #4a5260; margin: 0 0 28px; }
    a { display: inline-block; background: #2447f5; color: #fff; padding: 14px 22px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    a:focus-visible { outline: 3px solid #12161c; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>Welcome to the Library Book Management System</h1>
    <p>Search the catalogue and check which books are on the shelf right now.</p>
    <a href="/home">Open the catalogue</a>
  </main>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const { method } = req;
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;
  const bookIdMatch = pathname.match(/^\/books\/(\d+)$/);

  // Preflight requests from the browser
  if (method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();

  // GET /
  } else if (pathname === '/' && method === 'GET') {
    sendHTML(res, 200, welcomePage);

  // GET /books (supports ?search=, ?available=, ?category=)
  } else if (pathname === '/books' && method === 'GET') {
    sendJSON(res, 200, filterBooks(requestUrl.searchParams));

  // GET /about
  } else if (pathname === '/about' && method === 'GET') {
    sendJSON(res, 200, {
      application: 'Library Book Management Web Application',
      description: 'Demonstrates Node.js HTTP module, routing, FS module and Express.js',
      version: '1.0.0'
    });

  // GET /home -> serve public/index.html using FS module
  } else if (pathname === '/home' && method === 'GET') {
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        sendHTML(res, 500, '<h1>500 - Error reading file</h1>');
        return;
      }
      sendHTML(res, 200, content);
    });

  // POST /add-book
  } else if (pathname === '/add-book' && method === 'POST') {
    readJSONBody(req, res, (book) => {
      const { id, title, author, price, category } = book;
      if (id === undefined || !title || !author || price === undefined) {
        sendJSON(res, 400, { error: 'id, title, author and price are required' });
        return;
      }
      if (books.some((b) => b.id === id)) {
        sendJSON(res, 409, { error: 'Book with this id already exists' });
        return;
      }

      const newBook = { id, title, author, price, category: category || 'General', available: true };
      books.push(newBook);
      sendJSON(res, 201, { message: 'Book added successfully', book: newBook });
    });

  // PUT /books/:id - update details or availability (issue / return)
  } else if (bookIdMatch && method === 'PUT') {
    readJSONBody(req, res, (changes) => {
      const book = books.find((b) => b.id === Number(bookIdMatch[1]));
      if (!book) {
        sendJSON(res, 404, { error: 'Book not found' });
        return;
      }
      if (changes.available !== undefined && typeof changes.available !== 'boolean') {
        sendJSON(res, 400, { error: 'available must be true or false' });
        return;
      }
      ['title', 'author', 'price', 'category', 'available'].forEach((field) => {
        if (changes[field] !== undefined) book[field] = changes[field];
      });
      sendJSON(res, 200, { message: 'Book updated successfully', book });
    });

  // Known route but wrong method
  } else if (['/', '/books', '/about', '/home', '/add-book'].includes(pathname) || bookIdMatch) {
    sendJSON(res, 405, { error: 'Method Not Allowed' });

  // Invalid route
  } else {
    sendHTML(res, 404, '<h1>404 - Page Not Found</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`HTTP Server running at http://localhost:${PORT}`);
});

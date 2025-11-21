const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'truewipe_secret_key';
const DB_PATH = path.join(__dirname, 'truewipe.db');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      mac_address TEXT,
      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS wipe_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at DATETIME,
      completed_at DATETIME,
      result TEXT,
      FOREIGN KEY (device_id) REFERENCES devices (id)
    )`);
    
    // Create default admin user if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password_hash) VALUES ('admin', ?)`, [defaultPassword]);
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({ token, username: user.username });
  });
});

app.get('/api/devices', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM devices ORDER BY registered_at DESC`, [], (err, devices) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(devices);
  });
});

app.post('/api/devices/:id/wipe', authenticateToken, (req, res) => {
  const deviceId = req.params.id;
  const { method, verificationLevel } = req.body; // Enhanced options
  
  const validMethods = ['1-pass', '3-pass', '7-pass', 'gutmann', 'schneier', 'pfitzner'];
  const validVerification = ['quick', 'thorough', 'forensic', 'military', 'quantum'];
  
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: 'Invalid wipe method' });
  }
  
  if (verificationLevel && !validVerification.includes(verificationLevel)) {
    return res.status(400).json({ error: 'Invalid verification level' });
  }
  
  // Check if device exists
  db.get(`SELECT * FROM devices WHERE id = ?`, [deviceId], (err, device) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Create wipe job
    const methodString = verificationLevel ? `${method}|${verificationLevel}` : method;
    const stmt = db.prepare(`INSERT INTO wipe_jobs (device_id, method, status) VALUES (?, ?, ?)`);
    stmt.run([deviceId, methodString, 'pending'], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Notify connected client (if any) about the wipe command
      io.to(`device_${deviceId}`).emit('wipe_command', {
        jobId: this.lastID,
        method: method,
        verificationLevel: verificationLevel
      });
      
      res.json({ 
        jobId: this.lastID,
        message: 'Wipe command sent to device'
      });
    });
    stmt.finalize();
  });
});

app.get('/api/jobs', authenticateToken, (req, res) => {
  const { deviceId } = req.query;
  
  let query = `SELECT w.*, d.name as device_name, d.ip_address 
               FROM wipe_jobs w 
               JOIN devices d ON w.device_id = d.id`;
  let params = [];
  
  if (deviceId) {
    query += ` WHERE w.device_id = ?`;
    params.push(deviceId);
  }
  
  query += ` ORDER BY w.started_at DESC`;
  
  db.all(query, params, (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(jobs);
  });
});

// New endpoint for compliance reports
app.get('/api/reports/:jobId', authenticateToken, (req, res) => {
  const jobId = req.params.jobId;
  
  db.get(`SELECT * FROM wipe_jobs WHERE id = ?`, [jobId], (err, job) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Parse the method and verification level
    const [method, verificationLevel] = job.method.split('|');
    
    res.json({
      jobId: job.id,
      deviceId: job.device_id,
      method: method,
      verificationLevel: verificationLevel,
      status: job.status,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      result: job.result ? JSON.parse(job.result) : null
    });
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Device registration
  socket.on('register_device', (data) => {
    const { name, ipAddress, macAddress } = data;
    
    if (!name || !ipAddress) {
      socket.emit('registration_error', { error: 'Name and IP address required' });
      return;
    }
    
    // Update or insert device
    db.get(`SELECT * FROM devices WHERE ip_address = ?`, [ipAddress], (err, device) => {
      if (err) {
        socket.emit('registration_error', { error: 'Database error' });
        return;
      }
      
      if (device) {
        // Update existing device
        db.run(`UPDATE devices SET name = ?, mac_address = ?, status = ?, last_seen = CURRENT_TIMESTAMP 
                WHERE id = ?`, [name, macAddress, 'online', device.id], (err) => {
          if (err) {
            socket.emit('registration_error', { error: 'Database error' });
            return;
          }
          
          socket.join(`device_${device.id}`);
          socket.emit('registered', { deviceId: device.id, message: 'Device updated' });
          io.emit('devices_updated'); // Notify all admin panels
        });
      } else {
        // Insert new device
        const stmt = db.prepare(`INSERT INTO devices (name, ip_address, mac_address, status) 
                                 VALUES (?, ?, ?, ?)`);
        stmt.run([name, ipAddress, macAddress, 'online'], function(err) {
          if (err) {
            socket.emit('registration_error', { error: 'Database error' });
            return;
          }
          
          socket.join(`device_${this.lastID}`);
          socket.emit('registered', { deviceId: this.lastID, message: 'Device registered' });
          io.emit('devices_updated'); // Notify all admin panels
        });
        stmt.finalize();
      }
    });
  });
  
  // Job status update from device
  socket.on('job_status_update', (data) => {
    const { jobId, status, progress, result } = data;
    
    let query = `UPDATE wipe_jobs SET status = ?`;
    let params = [status];
    
    if (progress !== undefined) {
      query += `, progress = ?`;
      params.push(progress);
    }
    
    if (result !== undefined) {
      query += `, result = ?`;
      params.push(JSON.stringify(result));
    }
    
    query += ` WHERE id = ?`;
    params.push(jobId);
    
    db.run(query, params, (err) => {
      if (err) {
        console.error('Error updating job status:', err);
        return;
      }
      
      // Notify admin panels about status update
      io.emit('job_status_updated', { jobId, status, progress, result });
    });
  });
  
  // Device disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // In a production environment, you might want to mark devices as offline
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`Admin panel running on http://localhost:${PORT}`);
});
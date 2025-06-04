// MongoDB initialization script
db = db.getSiblingDB('chatdb');

// Create collections with initial indexes
db.createCollection('users');
db.createCollection('rooms');
db.createCollection('messages');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "firstName": 1, "lastName": 1 });

db.rooms.createIndex({ "name": 1 });
db.rooms.createIndex({ "owner": 1 });
db.rooms.createIndex({ "members": 1 });
db.rooms.createIndex({ "isPrivate": 1 });

db.messages.createIndex({ "room": 1, "createdAt": -1 });
db.messages.createIndex({ "sender": 1 });
db.messages.createIndex({ "createdAt": -1 });

print('Database initialized with collections and indexes');

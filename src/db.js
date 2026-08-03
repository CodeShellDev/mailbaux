const logger = require("./logger")
const config = require("./config")

const { MongoClient } = require("mongodb")
const redis = require("redis")

let mongoClient, mongoSession
let redisClient

async function Init() {
	mongoClient = new MongoClient(config.DB_URI)

	await mongoClient.connect()

	logger.db("Connected to MongoDB")

	mongoSession = mongoClient.startSession()

	logger.db("Started MongoDB Session")

	redisClient = redis.createClient({ url: config.REDIS_URI })

	await redisClient.connect()

	logger.db("Connected to Redis")
}

async function Close() {
	logger.db("Closing MongoDB Connection")

	await mongoSession.endSession()
	await mongoClient.close()
}

function Connect() {
	return mongoClient.db(config.DB_NAME)
}

// Mongo

async function InsertUser(user) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.insertOne(user)

	return result
}

async function GetUserByID(id) {
	const db = await Connect()

	const collection = db.collection("users")

	return await collection.findOne({ id: id })
}

async function DeleteUserByID(id) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.deleteOne({ id: id })

	logger.db("Deleted a User")

	return result
}

async function FindBy(query) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.findOne(query)

	return result
}

async function AddToArray(query, update) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.updateOne(
		query,
		{ $addToSet: update },
		{ upsert: true },
	)

	return result
}

async function DeleteFromArrayBy(query, update) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.updateOne(query, { $pull: update })

	return result
}

async function UpdateBy(query, update) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.updateOne(
		query,
		{ $set: update },
		{ upsert: true },
	)

	return result
}

// REDIS

async function GetFromCache(key, hash = false) {
	if (hash) {
		return await redisClient.hGetAll(key)
	} else {
		return await redisClient.get(key)
	}
}

async function WriteToCache(key, value, hash = false, ttl = 3600) {
	if (hash) {
		await redisClient.hSet(key, value)
	} else {
		await redisClient.set(key, value)
	}

	await redisClient.expire(key, ttl)
}

async function DeleteFromCache(key, hash = false) {
	if (hash) {
		await redisClient.hDel(key)
	} else {
		await redisClient.del(key)
	}
}

exports.DeleteUserByID = DeleteUserByID
exports.GetUserByID = GetUserByID
exports.InsertUser = InsertUser
exports.Init = Init
exports.Close = Close

exports.AddToArray = AddToArray
exports.FindBy = FindBy
exports.UpdateBy = UpdateBy
exports.DeleteFromArrayBy = DeleteFromArrayBy

exports.GetFromCache = GetFromCache
exports.WriteToCache = WriteToCache
exports.DeleteFromCache = DeleteFromCache

import logger from "#utils/logger"
import config from "#utils/config"

import { MongoClient } from "mongodb"
import { createClient } from "redis"

let mongoClient, mongoSession
let redisClient

export async function Init() {
	mongoClient = new MongoClient(config.DB_URI)

	await mongoClient.connect()

	_db("Connected to MongoDB")

	mongoSession = mongoClient.startSession()

	_db("Started MongoDB Session")

	redisClient = createClient({ url: config.REDIS_URI })

	await redisClient.connect()

	_db("Connected to Redis")
}

export async function Close() {
	_db("Closing MongoDB Connection")

	await mongoSession.endSession()
	await mongoClient.close()
}

export function Connect() {
	return mongoClient.db(config.DB_NAME)
}

// Mongo

export async function InsertUser(user) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.insertOne(user)

	return result
}

export async function GetUserByID(id) {
	const db = await Connect()

	const collection = db.collection("users")

	return await collection.findOne({ id: id })
}

export async function DeleteUserByID(id) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.deleteOne({ id: id })

	_db("Deleted a User")

	return result
}

export async function FindBy(query) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.findOne(query)

	return result
}

export async function AddToArray(query, update) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.updateOne(
		query,
		{ $addToSet: update },
		{ upsert: true },
	)

	return result
}

export async function DeleteFromArrayBy(query, update) {
	const db = await Connect()

	const collection = db.collection("users")

	const result = await collection.updateOne(query, { $pull: update })

	return result
}

export async function UpdateBy(query, update) {
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

export async function GetFromCache(key) {
	const value = await redisClient.get(key)

	if (value === null) {
		return null
	}

	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}

export async function WriteToCache(key, value, ttl = 3600) {
	if (typeof value !== "string") {
		value = JSON.stringify(value)
	}

	await redisClient.set(key, value)
	await redisClient.expire(key, ttl)
}

export async function DeleteFromCache(key) {
	await redisClient.del(key)
}

export function GetMongoDB() {
	return mongoClient
}

export function GetRedis() {
	return redisClient
}

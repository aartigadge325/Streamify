const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
exports.subscribe = asyncHandler(async (req,res) => { const channelId=req.params.channelId; if(!mongoose.isValidObjectId(channelId)||!(await User.exists({_id:channelId}))) throw new ApiError(404,'Channel not found'); if(channelId===req.auth.userId) throw new ApiError(400,'You cannot subscribe to yourself'); await Subscription.updateOne({subscriber:req.auth.userId,channel:channelId},{$setOnInsert:{subscriber:req.auth.userId,channel:channelId}},{upsert:true}); res.status(201).json({success:true,message:'Subscribed'}); });
exports.unsubscribe = asyncHandler(async (req,res) => { await Subscription.deleteOne({subscriber:req.auth.userId,channel:req.params.channelId}); res.json({success:true,message:'Unsubscribed'}); });
exports.mine = asyncHandler(async (req,res) => { const data=await Subscription.find({subscriber:req.auth.userId}).sort({createdAt:-1}).populate('channel','username fullName avatarUrl'); res.json({success:true,data}); });
exports.subscribers = asyncHandler(async (req,res) => { const id=req.params.channelId;if(!mongoose.isValidObjectId(id))throw new ApiError(404,'Channel not found');const page=Math.max(1,parseInt(req.query.page,10)||1),limit=Math.min(50,Math.max(1,parseInt(req.query.limit,10)||20));const [data,total]=await Promise.all([Subscription.find({channel:id}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).populate('subscriber','username fullName avatarUrl'),Subscription.countDocuments({channel:id})]);res.json({success:true,data,pagination:{page,limit,total,pages:Math.ceil(total/limit)}}); });

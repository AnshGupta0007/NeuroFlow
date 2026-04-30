const authService = require('./auth.service');
const { success, created } = require('../../utils/response');
const { z } = require('zod');

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100)
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

async function signUp(req, res, next) {
  try {
    const body = signUpSchema.parse(req.body);
    const result = await authService.signUp(body);
    created(res, result, 'Account created successfully');
  } catch (err) { next(err); }
}

async function signIn(req, res, next) {
  try {
    const body = signInSchema.parse(req.body);
    const result = await authService.signIn(body);
    success(res, result, 'Signed in successfully');
  } catch (err) { next(err); }
}

async function signOut(req, res, next) {
  try {
    await authService.signOut(req.token);
    success(res, null, 'Signed out successfully');
  } catch (err) { next(err); }
}

async function getProfile(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);
    success(res, profile);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const updated = await authService.updateProfile(req.user.id, req.body);
    success(res, updated, 'Profile updated');
  } catch (err) { next(err); }
}

module.exports = { signUp, signIn, signOut, getProfile, updateProfile };

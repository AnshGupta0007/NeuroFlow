const intelligenceService = require('./intelligence.service');
const { success } = require('../../utils/response');
const { z } = require('zod');

async function getProjectIntelligence(req, res, next) {
  try {
    const data = await intelligenceService.getProjectIntelligence(req.params.projectId, req.user.id);
    success(res, data);
  } catch (err) { next(err); }
}

async function askQuestion(req, res, next) {
  try {
    const { question, useGrok } = z.object({
      question: z.string().min(3).max(500),
      useGrok: z.boolean().optional()
    }).parse(req.body);

    let answer;
    if (useGrok) {
      answer = await intelligenceService.askGrok(question, req.params.projectId, req.user.id);
    } else {
      answer = await intelligenceService.answerAIQuestion(question, req.params.projectId, req.user.id);
    }
    success(res, answer);
  } catch (err) { next(err); }
}

module.exports = { getProjectIntelligence, askQuestion };

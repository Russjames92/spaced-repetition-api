const express = require('express')
const LanguageService = require('./language-service')
const { requireAuth } = require('../middleware/jwt-auth')
const jsonParser = express.json();

const languageRouter = express.Router()

languageRouter
  .use(requireAuth)
  .use(async (req, res, next) => {
    try {
      const language = await LanguageService.getUsersLanguage(
        req.app.get('db'),
        req.user.id,
      )

      if (!language)
        return res.status(404).json({
          error: `You don't have any languages`,
        })

      req.language = language
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .get('/', async (req, res, next) => {
    try {
      const words = await LanguageService.getLanguageWords(
        req.app.get('db'),
        req.language.id,
      )

      res.json({
        language: req.language,
        words,
      })
      next()
    } catch (error) {
      next(error)
    }
  })

languageRouter
  .get('/head', async (req, res, next) => {
    try {
      const [nextWord] = await LanguageService.getNextWord(
        req.app.get('db'),
        req.language.id
      );

      res.json({
        nextWord: nextWord.original,
        totalScore: req.language.total_score,
        wordCorrectCount: nextWord.correct_count,
        wordIncorrectCount: nextWord.incorrect_count,
      });
      next();
    } catch (error) {
      next(error);
    }
  });

languageRouter
  .post('/guess', async (req, res, next) => {
    try {
      const { guess } = req.body;
      if (!guess) {
        res.status(400).json({
          error: `Missing 'guess' in request body`,
        });
      } else {
        const words = await LanguageService.getLanguageWords(
          req.app.get('db'),
          req.language.id
        );

        const wordList = await LanguageService.createWordList(
          words,
          req.language
        );

        let isCorrect = false;
        const current = wordList.head;
        let translation = current.value.translation;
        let totalScore = req.language.total_score;

        if (quess === translation) {
          isCorrect = true;
          current.value.correct_count++;
          current.value.memory_value *= 2;
          totalScore++;
        } else {
          current.value.incorrect_count++;
          current.value.memory_value = 1;
        }

        wordList.remove(current.value);
        wordList.insertAt(current.value, current.value.memory_value + 1);

        const next = wordList.head.value;

        await LanguageService.updateWords(
          req.app.get('db'),
          req.language.id,
          wordList,
          totalScore,
        );

        res.json({
          nextWord: next.original,
          wordCorrectCount: next.correct_count,
          wordIncorrectCount: next.incorrect_count,
          totalScore,
          answer: translation,
          isCorrect,
        });
      }
    } catch (error) {
      next(error);
    }
  });

module.exports = languageRouter

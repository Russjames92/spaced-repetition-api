const { LinkedList, display } = require('./LinkedList')

const LanguageService = {
  getUsersLanguage(db, user_id) {
    return db
      .from('language')
      .select(
        'language.id',
        'language.name',
        'language.user_id',
        'language.head',
        'language.total_score',
      )
      .where('language.user_id', user_id)
      .first()
  },

  getLanguageWords(db, language_id) {
    return db
      .from('word')
      .select(
        'id',
        'language_id',
        'original',
        'translation',
        'next',
        'memory_value',
        'correct_count',
        'incorrect_count',
      )
      .where({ language_id })
  },

  getNextWord(db, language_id) {
    return db
      .from('word')
      .join(
        'language',
        'word.id',
        '=',
        'language.head'
      )
      .select(
        'original',
        'language_id',
        'correct_count',
        'incorrect_count'
      )
      .where({ language_id });
  },

  createWordList(words, language) {
    const wordList = new LinkedList();

    let currWord = words.find((word) => word.id === language.head);
    wordList.insertLast(currWord);

    while (currWord.next !== null) {
      currWord = words.find((word) => word.id === currWord.next);
      wordList.insertLast(currWord);
    }
    return wordList;
  },

  updateWords(db, language_id, words, totalScore) {
    const newList = display(words);
    for (let i = 0; i < newList.length; i++) {
      if (i + 1 >= newList.length) {
        newList[i].next = null;
      } else {
        newList[i].next = newList[i + 1].id;
      }
    }
    return db.transaction(async (trx) => {
      await Promise.all([
        await trx('language').where({ id: language_id }).update({
          total_score: totalScore,
          head: words.head.value.id,
        }),
        ...newList.map((item) => {
          return trx('word')
            .where({ id: item.id })
            .update({ ...item });
        }),
      ]);
    });
  },
};

module.exports = LanguageService

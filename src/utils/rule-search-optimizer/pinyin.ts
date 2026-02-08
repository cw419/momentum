export function getPinyin(text: string): string {
  // 简化的拼音转换，实际项目中可以使用专门的拼音库
  const pinyinMap: Record<string, string> = {
    上: 'shang',
    厕: 'ce',
    所: 'suo',
    喝: 'he',
    水: 'shui',
    茶: 'cha',
    接: 'jie',
    电: 'dian',
    话: 'hua',
    开: 'kai',
    会: 'hui',
    车: 'che',
    紧: 'jin',
    急: 'ji',
    事: 'shi',
    家: 'jia',
    庭: 'ting',
    人: 'ren',
    技: 'ji',
    术: 'shu',
    故: 'gu',
    障: 'zhang',
    任: 'ren',
    务: 'wu',
    完: 'wan',
    成: 'cheng',
    提: 'ti',
    前: 'qian',
    结: 'jie',
    束: 'shu',
    目: 'mu',
    标: 'biao',
    达: 'da',
  };

  return text
    .split('')
    .map((char) => pinyinMap[char] || char)
    .join('');
}

export function getFirstLetters(text: string): string {
  const firstLetterMap: Record<string, string> = {
    上: 's',
    厕: 'c',
    所: 's',
    喝: 'h',
    水: 's',
    茶: 'c',
    接: 'j',
    电: 'd',
    话: 'h',
    开: 'k',
    会: 'h',
    车: 'c',
    紧: 'j',
    急: 'j',
    事: 's',
    家: 'j',
    庭: 't',
    人: 'r',
    技: 'j',
    术: 's',
    故: 'g',
    障: 'z',
    任: 'r',
    务: 'w',
    完: 'w',
    成: 'c',
    提: 't',
    前: 'q',
    结: 'j',
    束: 's',
    目: 'm',
    标: 'b',
    达: 'd',
  };

  return text
    .split('')
    .map((char) => firstLetterMap[char] || char.toLowerCase())
    .join('');
}

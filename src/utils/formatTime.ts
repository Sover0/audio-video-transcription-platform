/**
 * 将毫秒数转换为 HH:MM:SS 格式的字符串
 * @param ms 毫秒数
 * @returns 格式化的时间字符串，如 00:00:03（3秒）、01:05:23（1小时5分23秒）
 */
export const formatTime = (ms: number): string => {
  // 将毫秒转换为总秒数
  const totalSeconds = Math.floor(ms / 1000);
  
  // 计算小时、分钟、秒
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // 格式化每个部分，确保两位数字，不足补零
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  
  // 组合成最终格式
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

// 使用示例
// const time1 = formatTime(3000); // 输出: "00:00:03"
// const time2 = formatTime(3923000); // 输出: "01:05:23"
// const time3 = formatTime(7200000); // 输出: "02:00:00"

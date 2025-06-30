import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import QuickStudyMode from '../components/Study/QuickStudyMode';
import StudyMode from '../components/Study/StudyMode';
import PracticeMode from '../components/Study/PracticeMode';
import WrongQuestionReviewMode from '../components/Study/WrongQuestionReviewMode';

const StudyPage: React.FC = () => {
  const location = useLocation();

  // 根据路由直接渲染对应的组件，不依赖 studyMode 状态
  switch (location.pathname) {
    case '/study':
      return <StudyMode />; // 背题模式
    case '/practice':
      return <PracticeMode />; // 刷题模式
    case '/quick-study':
      return <QuickStudyMode />; // 快刷模式
    default:
      return <StudyMode />; // 默认显示背题模式
  }
};

export default StudyPage;

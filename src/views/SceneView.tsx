/**
 * @file SceneView.tsx
 * @description 闂傚倷绶氬缁樹繆閸ヮ剙纾块柕鍫濇噳閺嬪秵绻涢崱妯诲碍缂佲偓瀹€鍕厸鐎广儱鍟俊鑺ャ亜锜婚崶銊㈡嫽闂佺鏈銊╁箺閻樼偨浜滈柡鍌濇硶閻忛亶鏌熼崣澶嬪唉鐎规洖宕灃濞达絼璀﹀ú?- 闂傚倷鑳剁涵鍫曞疾閻愬樊娴栭柕濞у棗小濡炪倖甯掗崯銊︾瑜版帗鐓欓柟顖嗗啯姣愬銈冨€曢幊蹇曟崲濠靛牆鏋堟俊顖濇〃婢规洘绻濋悽闈涗哗閻忓浚浜、姘愁槻闁崇懓鍟撮崺鈧い鎺戝閻撴盯鏌涘鈧粈渚€鎮橀敐鍥╃＜妞ゆ棁鍋愯倴婵炲濯寸粻鎾愁嚕閹绢喗鍋愭い鏃囧吹妞规娊姊绘担鍛婂暈妞ゃ劍鍔楀Σ鎰板即閻斿憡鐝烽梺鍝勮癁鐏炶姤顓块梻濠庡亜濞诧箑顫忚ぐ鎹ゅ洩顦规慨濠傤煼瀹曟帒顫濇潏銊﹀枛婵＄偑鍊栭弻銊╂儗閸屾氨鏆︽慨妞诲亾鐎规洏鍔戦、妯款槻闁?
 * @updated 2026-05-05: Fixed SceneView widget-session matching by reading active sessions from SessionContext instead of DataContext, preventing undefined access crashes in scene cards.
 * @updated 2026-05-01: Added a manual-mode scene-group dropdown on the scene header chip so users can quickly switch groups directly from the scene page.
 * @updated 2026-04-25: Added flex min-height guards for the scene sidebar and card list so long card stacks keep scrolling instead of being clipped on some mobile WebViews.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { IconRenderer } from '../components/IconRenderer';
import { UIIcon } from '../components/UIIcon';
import { SceneCard } from '../components/SceneCard';
import { TimeSlot, SceneCardData, Activity, Category, TodoItem, DailyReview, CheckItem, WeeklyReview, MonthlyReview, AppView, SceneGroupState } from '../types';
import { DEFAULT_SCENE_PRESETS } from '../constants/scenePresets';
import { useReview } from '../contexts/ReviewContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useData } from '../contexts/DataContext';
import { useSession } from '../contexts/SessionContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { getLocalDateStr } from '../utils/dateUtils';
import { findAutoSwitchTargetGroup, getActiveSceneGroup, loadSceneGroupStateFromStorage, saveSceneGroupStateToStorage } from '../utils/sceneGroupStorage';
import { updateLocalDataTimestamp } from '../utils/localDataTimestamp';
import { useBackgroundDisplay } from '../hooks/useBackgroundDisplay';

interface SceneViewProps {
  onConfigureSlots?: () => void;
  onStartActivity: (activity: Activity, categoryId: string, autoEnterFocus?: boolean) => void;
  onStartTodoFocus?: (todo: TodoItem, autoEnterFocus?: boolean) => void;
  onAddLog?: (startTime?: number, endTime?: number, prefilledData?: { categoryId?: string; activityId?: string; linkedTodoId?: string }) => void;
  categories: Category[];
  todos?: TodoItem[];
}

export const SceneView: React.FC<SceneViewProps> = ({ 
  onConfigureSlots,
  onStartActivity,
  onStartTodoFocus,
  onAddLog,
  categories,
  todos = []
}) => {
  const { dailyReviews, checkTemplates, reviewTemplates, setDailyReviews, weeklyReviews, setWeeklyReviews, monthlyReviews, setMonthlyReviews } = useReview();
  const { logs } = useData();
  const { activeSessions } = useSession();
  const { addToast } = useToast();
  const { sceneCardTimerMode } = useSettings();
  const { 
    setCurrentView, 
    setIsDailyReviewOpen, 
    setCurrentReviewDate, 
    setIsWeeklyReviewOpen, 
    setCurrentWeeklyReviewStart,
    setCurrentWeeklyReviewEnd,
    setIsMonthlyReviewOpen, 
    setCurrentMonthlyReviewStart,
    setCurrentMonthlyReviewEnd,
    setPreviousView,
    setStatsRange
  } = useNavigation();
  const { backgroundUrl, hasBackground, panelOverlayOpacity, useReducedEffects } = useBackgroundDisplay();
  
  // 闂傚倷绶氬缁樹繆閸ヮ剙纾块柕鍫濇噳閺嬪秵绻涢崱妯虹仼缁炬儳銈搁弻娑㈠即閵娿儱绠圭紒妤佸灴濮婅櫣鎷犻垾鍐插箰缂備浇缈伴崐妤€危閹邦兘鏋庨柟閭﹀櫘濞?localStorage 闂傚倷绀侀幉鈥愁潖缂佹ɑ鍙忛柟顖ｇ亹瑜版帒鐐婃い鎺嶇劍濞呮牠鏌ｈ箛鏇炰哗婵☆偄瀚伴獮鍐箣閿旇棄鈧數鐥鐐村婵炲吋鍔栨穱濠囶敃椤愵澀鍠婇悗娈垮櫘閸嬪﹪骞冭瀹曠厧鈹戦崼娑樹喊闂備礁鎼ˇ顐﹀疾濞嗘挻鍤勯柡鍫㈡暩閺勫倿姊?
  const [sceneGroupState, setSceneGroupState] = useState<SceneGroupState>(() => loadSceneGroupStateFromStorage());
  const activeGroup = getActiveSceneGroup(sceneGroupState);
  const matchedAutoGroup = sceneGroupState.switchMode === 'auto'
    ? findAutoSwitchTargetGroup(sceneGroupState, new Date())
    : null;
  const displayedGroup = matchedAutoGroup || activeGroup;
  const timeSlots: TimeSlot[] = displayedGroup?.timeSlots || DEFAULT_SCENE_PRESETS;
  
  // 闂佽崵鍠愮划搴㈡櫠濡ゅ懎绠伴柛娑橈攻濞呯娀鏌ｅΟ鑲╁笡闁绘帟顕ч…璺ㄦ崉娓氼垱歇闂佸憡锕╅崜鐔煎蓟閿濆惟闁靛鍎烘禒鎯р攽閿涘嫬浠滈柛濠傜仢椤繘鎳￠妶鍌氫壕婵炴垶鐟辨笟娑㈡煕閻愬灚娅曠紒杈ㄥ笚缁楃喖宕归鍙ユ偅缂?
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  
  // 闂傚倷鐒﹀鍨焽閸ф绀夐悗锝庡墲婵櫕銇勯幒鎴濃偓褰掑窗閸℃稒鐓ラ柡鍥殔娴滈箖鎮峰鍕凡闁稿﹨宕靛Σ鎰板箳濡や礁浜滃┑鐐跺蔼椤曆囧箖娓氣偓濮婃椽宕ㄦ繝搴㈩吅缂備浇椴稿ú姗€寮查崼鏇炲唨妞ゆ挾鍠庨崜顓㈡⒑閸涘﹥澶勯柛銊︽緲閳诲秹濮€閵堝棛鍘搁梺绋挎湰缁嬫垿顢撳鍕╀簻闁规崘娅曢幉鍝ョ磼?
  const [statsUpdateTrigger, setStatsUpdateTrigger] = useState(0);
  const isManualSceneGroupMode = sceneGroupState.switchMode !== 'auto';

  const isWidgetSessionMatchForCard = (card: SceneCardData): boolean => {
    if (card.type === 'timer' && card.action.type === 'startTimer') {
      return activeSessions.some((session) =>
        session.source === 'widget'
        && session.activityId === card.action.activityId
        && session.categoryId === card.action.categoryId
      );
    }

    if (card.type === 'todo' && card.action.type === 'startTodo') {
      return activeSessions.some((session) =>
        session.source === 'widget'
        && session.linkedTodoId === card.action.todoId
      );
    }

    return false;
  };

  const getStoredSceneCardFlipState = (cardId: string): boolean =>
    localStorage.getItem(`scene_card_flipped_${cardId}`) === 'true';

  const loadSceneGroups = () => {
    const loaded = loadSceneGroupStateFromStorage();
    setSceneGroupState(loaded);
  };

  const persistSceneGroupState = (nextState: SceneGroupState) => {
    const saved = saveSceneGroupStateToStorage(nextState);
    setSceneGroupState(saved);
    updateLocalDataTimestamp();
    window.dispatchEvent(new Event('sceneGroupsUpdated'));
    window.dispatchEvent(new Event('sceneTimeSlotsUpdated'));
  };

  const handleManualGroupSelect = (groupId: string) => {
    setIsGroupMenuOpen(false);
    if (!isManualSceneGroupMode || sceneGroupState.activeGroupId === groupId) {
      return;
    }
    const exists = sceneGroupState.groups.some(group => group.id === groupId);
    if (!exists) {
      return;
    }
    persistSceneGroupState({
      ...sceneGroupState,
      activeGroupId: groupId
    });
  };

  // 闂傚倷绀侀幉鈥愁潖缂佹ɑ鍙忛柟顖ｇ亹瑜版帒鐐婃い鎺嗗亾缂侇偄绉归弻娑㈩敃閿濆棛顦ㄩ梺鎸庣〒閸犳劗鎹㈠☉銏犻唶婵犻潧鐗呯划鐢告⒑閸濆嫭顥犻柛鐘崇墵閻?
  useEffect(() => {
    // 闂傚倷绀侀幉锛勬暜濡ゅ啯宕查柛宀€鍎戠紞鏍煙閻楀牊绶茬紒鈧径鎰厽婵☆垳鍘ч崝瀣磼?
    loadSceneGroups();

    // 闂傚倷鑳堕崕鐢稿疾濠婂牆鍨傞柣銏㈩焾缁?storage 婵犵數鍋涢悺銊у垝瀹€鍕垫晞闁告洦鍋€閺嬪酣鏌曡箛瀣偓鏍疾椤掑嫭鍊堕柣鎰仛濞呮洜绱掓径濞垮仮闁哄本绋栫粻娑㈠籍閳ь剟寮搁崟顓犵＜妞ゆ洖鎳庢晶瀵糕偓娈垮枙缁瑥鐣烽崼鏇炵厸濠电姴鍊歌ⅷ婵犵绱曢崑鎴﹀磹閺囥垺鍊舵慨妯挎硾閸ㄥ倿鏌曟繛鐐珔闁圭懓鐖奸弻锝夊箣閻愬棙鍨块幃鐢割敍閻愭潙浠繛杈剧悼椤牓鍩涢弮鍫熺厽闁靛牆鎳忛ˉ鐐烘煏閸パ冾伃闁诡喕绮欏畷銊︾節閸愶腹鍋撻崘鈺冪闁挎繂鎳忕粊鈺呮煕閻樻剚娈滅€殿噮鍋呯缓鐣岀矙閹稿海鈧剟姊虹紒姗嗘當闁绘妫涚划濠囨晝閸屾稓鍘搁梺鍛婂姂閸斿酣宕洪敐澶嬬厱闁挎繂妫欓崐鎰偓娈垮櫘閸撶喎顕ｉ崼鏇炲瀭妞ゆ洖鎳忔總鏍⒑?
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sceneGroupState' || e.key === 'sceneTimeSlots') {
        loadSceneGroups();
      }
    };

    // 闂傚倷鑳堕崕鐢稿疾濠婂牆鍨傞柣銏㈩焾缁犳艾顭块懜闈涘闁搞倕锕ラ妵鍕疀閹炬剚浼€闂佸搫妫欏姗€鍩ユ径鎰婵炲棛鍋撳暩缂傚倷闄嶉崝濠囧礉瀹ュ洨鐭夐柟鐑樻⒐婵ジ鏌涢敂璇插箻妞わ富鍣ｉ幃宄邦煥閸涱収鏆梺鐟版啞閹倿鐛崘顔肩閻庣數纭堕弸鏍⒑闁偛鑻晶顖炴煏閸パ冾伃闁诡喕绮欏畷銊︾節閸愶腹鍋撻崘顔解拺闁告稑锕ゆ慨鍥煙閸愯尙效妤犵偛鐗撴俊鎼佸煛娴ｅ搫鎽嬮梺鑽ゅ枑閻熴儳鈧凹鍘奸埢鎾诲醇閺囩喓鍘甸柣鐘叉礌閳ь剝娅曢悘宥呪攽閿涘嫬浠滈柛濠傛健瀵崵浠︾粵瀣倯闂佺硶鍓濋…鍥储閹扮増鈷戦柛娑橈攻閳锋帒鈹戦钘夊姢闂?
    const handleSceneUpdate = () => {
      loadSceneGroups();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sceneGroupsUpdated', handleSceneUpdate);
    window.addEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sceneGroupsUpdated', handleSceneUpdate);
      window.removeEventListener('sceneTimeSlotsUpdated', handleSceneUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 婵犵绱曢崑鎴﹀磹濡ゅ懎鏋侀悹鍥ф▕閻掕棄霉閻撳海鎽犻柣鎾冲€婚埀顒€绠嶉崕鍗炍涘▎鎾村亗闁逞屽墴濮婃椽宕ㄦ繝鍕櫧闂佹悶鍔庨弫濠氭晲閻愬搫骞㈡繛鎴烆焽閻嫰姊洪崜鎻掍簼婵炲弶鐗曢埢宥夊閵堝棛鍘搁梺绋挎湰缁嬫垿顢撳鍫熺厽闁挎洍鍋撻悗娑掓櫇閳ь剟娼ч妶绋款嚕閸洖绠伴幖杈剧悼濮ｏ綁姊绘担鍛婃儓闁瑰嘲顑夊畷鐟扮暦閸パ冪亰閻庡箍鍎遍ˇ浼村吹婵犲啨浜滈煫鍥ㄦ尭椤忊晝鎮悢鍏尖拺闁告稑锕ょ粭鎺撶箾鐠囇呯暠闁?
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSceneGroups();
      }
    };
    const handleFocus = () => {
      loadSceneGroups();
    };
    const handleRecordViewActivated = () => {
      loadSceneGroups();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔荤暗濞存粌缍婇弻鐔煎箚瑜嶉弳杈ㄣ亜閵堝懏鍤囬柡宀嬬節瀹曟﹢濡歌閻撶喎鈹戦埥鍡椾函婵炲娲熼崺鈧い鎺戝€归弳鈺呮煙閾忣偅灏甸柤娲憾瀵濡烽敃鈧崜顓㈡⒑閸涘﹥澶勯柛鎾村哺钘濈憸鏂款潖婵犳艾纾兼慨妯块哺閹茬厧顪冮妶鍡樼叆闁活剛鍘у嵄闁圭増婢橀～鍛存煟濡吋鏆╅柍?
  useEffect(() => {
    if (!isGroupMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setIsGroupMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isGroupMenuOpen]);

  useEffect(() => {
    if (!isManualSceneGroupMode) {
      setIsGroupMenuOpen(false);
    }
  }, [isManualSceneGroupMode]);

  useEffect(() => {
    const widgetSessions = activeSessions.filter((session) => session.source === 'widget');
    if (widgetSessions.length === 0) {
      return;
    }

    sceneGroupState.groups.forEach((group) => {
      group.timeSlots.forEach((slot) => {
        slot.cards.forEach((card) => {
          if (isWidgetSessionMatchForCard(card) && !getStoredSceneCardFlipState(card.id)) {
            localStorage.setItem(`scene_card_flipped_${card.id}`, 'true');
          }
        });
      });
    });
  }, [activeSessions, sceneGroupState]);

  useEffect(() => {
    setIsGroupMenuOpen(false);
  }, [sceneGroupState.activeGroupId]);

  const getCurrentTimeSlotIndex = (): number => {
    if (timeSlots.length === 0) return 0;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      
      // 闂備浇宕垫慨鎾箹椤愶附鍋柛銉㈡櫆瀹曟煡鏌涢幇鍏哥敖闁活厼顦湁闁挎繂娲ら崝瀣煛閸℃绠婚柡灞诲€栫缓鑺ュ緞婢跺瞼娉垮┑鐘愁問閸犳帡寮插┑瀣闁告洦鍘搁崑鎾诲捶椤撶倫锝囩磼娓氬洤娅嶉柡宀嬬秮婵℃悂濡烽妷顔荤棯婵犵绱曢崑娑㈠磹閸噮娼栭柤濮愬€愰崑鎾斥槈濞嗘瑤绶甸梺?
      if (slot.disableAutoSwitch) {
        continue;
      }
      
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      
      // 婵犵數濮伴崹鐓庘枖濞戞埃鍋撳鐓庢珝妤犵偛鍟换婵嬪礋椤掆偓绾绢垶姊洪棃娑辩劸闁稿寒鍨辩粋宥夘敍閻愬鍘靛銈嗙墬绾板秹宕宠ぐ鎺撶厱闁绘灏欓悞鎼佹煛娴ｅ摜效鐎规洜鍘ч埞鎴﹀箛椤撶喐鍊峰┑鐘垫暩閸庢垹寰婇挊澶屾殾妞ゆ帒濞?22:00 - 06:00闂?
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return i;
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return i;
        }
      }
    }
    
    return 0; // 婵犳鍠楃敮妤冪矙閹烘せ鈧箓宕奸妷顔芥櫍缂傚倷鐒﹁摫濞存嚎鍊濋弻锟犲磼濞戞﹩鍤嬬紓浣插亾闁逞屽墰缁辨挻鎷呯拠鈩冾吂闂佺绻戠粙鎾跺垝閳哄啠鍋撳☉娆樼劷闁?
  };

  // 闂傚倷鑳堕崢褔銆冩惔銏㈩洸婵犲﹤瀚崣蹇涙煃閸濆嫭鍣圭紒鈧崱娑欑厱闁靛绲芥俊濂稿箹閺夋埊韬柡灞剧洴楠炴帡骞樼€电鍤掔紓鍌氬€哥粔鎾敄婢跺﹦鏆︽繝濠傚枤閸氬鏌涢埄鍐夸緵婵″樊鍨跺濠氬磼濮橆兘鍋撻幖浣瑰仱闁靛ň鏅╅弫?- 闂傚倷绶氬鑽ゆ嫻閻旂厧绀夐柟杈捐礋閳ь剙鎳愰幏鐘裁圭€ｎ偆鈧姊洪悙钘夊姎闁哥喎娼￠敐鐐烘晲婢跺﹦楠囬梺缁樺姌閸╂牠藟婢舵劖鐓欏瀣椤ｅジ鏌曢崶褍顏柟顔荤矙瀹曘劍绻濋崘锔瑰亾閸愵喗鈷戦柛娑橈功閹虫劙鏌涢妸褎鏆柨婵堝仱瀹曞崬鈽夊Ο鑲╂殸闁荤喐绮岀粔鐑藉Φ閹邦厼绶為柟閭﹀墰椤﹂亶姊洪崫鍕犻柛鏂跨Ч钘濈憸鏃堝蓟閻旇櫣绠旀繛鎴炆戦敍宥夋煛閳?
  useEffect(() => {
    if (timeSlots.length === 0) return;
    
    // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔荤暗濞存粌缍婇弻鐔煎箚瑜嶉弳杈ㄣ亜閵堝懏鍤囬柡宀嬬節瀹曟﹢濡歌閻撶喎鈹戦埥鍡椾函婵炲娲熼崺鈧い鎺戝€归弳鈺呮煙閾忣偅灏甸柤娲憾瀵濡烽敃鈧崜顓㈡⒑閸涘﹥澶勯柛鎾村哺钘濈憸鏂款潖婵犳艾纾兼慨妯块哺閹茬厧顪冮妶鍡樼叆闁活剛鍘у嵄闁圭増婢橀～鍛存煟濡吋鏆╅柍?
    const autoSlotIndex = getCurrentTimeSlotIndex();
    
    // 闂備浇顕х换鎰崲閹寸姵宕查柛鈩冪⊕閸庡﹥銇勯弽銊с€掓い?localStorage 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎闁稿鍔戦弻鏇熺節韫囨洜鏆犻梺缁樻尰濞叉牠鍩ユ径鎰缂佹稖顫夐弫鎯ь渻閵堝棗濮囬柕鍫熸倐瀵宕ㄩ鑲╃獮闁诲函缍嗘禍鑸电閹绢喗鈷戞慨鐟版搐婵″ジ鎮楀鐓庡箹妞ゎ亜鍟村畷鎺楁倷缁瀚介梺璇插缁嬫帡鏁冮埡鍛埞?
    const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
    const savedSlotIndex = localStorage.getItem(savedSlotKey);
    
    // 闂傚倷绀侀幉锛勬暜閸ヮ剙纾归柡宥庡幖閽冪喖鏌涢妷顔煎闁告瑥锕ラ妵鍕冀閵娧屾殹闂佺楠搁敃顏堢嵁閺嶎偀鍋撳☉娅虫垿藟閸℃ǜ浜滈柡鍥╁枔椤ｆ煡鏌熷畡鐗堝櫧闁圭懓瀚版俊鎼佹晜閼恒儺鍚傛繝鐢靛剳缁茶棄煤閿旂偓宕查柛宀€鍋為崑銈夋煏婵炵偓娅嗛柛搴＄Ч閺屾盯寮撮妸銉ョ闂佺顑呯粔鍫曞焵?
    let targetIndex = autoSlotIndex;
    
    if (savedSlotIndex !== null) {
      const savedIndex = parseInt(savedSlotIndex, 10);
      
      // 濠电姷顣藉Σ鍛村磻閳ь剟鏌涚€ｎ偅宕岄柡宀嬬磿娴狅妇鎷犻幓鎺戭潚缂傚倷鑳剁划顖氼潩閵娾晛鐒垫い鎺嶈兌閳洘銇勯鐐存悙闁崇粯鎹囬獮瀣偐閹颁焦缍楅梻渚€娼х换鎺撴叏妞嬪海鐭氶柛褎顨嗛悡娑㈡煕閺囥垺娑ч柣蹇曞█閺岀喖顢涘▎鎴犵崲閻庢鍠栭悘姘嚗閸曨厸鍋撻敐搴′簼闁?
      if (savedIndex >= 0 && savedIndex < timeSlots.length) {
        // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閹煎瓨绋愬Ч妤呮⒑鐟欏嫬鍔ら柛鐔锋健璺柛娑卞枤缁犻箖鎮橀悙娈跨劸濠⒀冨级缁绘繈鍩€椤掍胶鐟归柍褜鍓欓悾鐑芥偐閹帊姹楅梺鍦劋閸ㄧ數鎸х€ｎ喗鈷戞慨鐟版搐婵″ジ鎮楀鐓庣仸鐎规洟娼ч…銊╁醇濠靛牜妲烽梻渚€娼ч…顓㈡⒔閸曨垁鍥樄婵﹤顭峰畷鎺戭潩鏉堛劍鍠栨俊鐐€栭弻銊╂儗閸岀偛鏋佺€广儱顦柨銈夋煕濡ゅ啩绲緊SlotIndex 闂傚倷绀佸﹢閬嶁€﹂崼婢濇椽濡舵径濠勭暫濠电姴锕ら悧濠囧磿瀹ュ鐓曢柡鍥ュ妼婢ь垳绮幋锔界厽闁绘劖娼欓崵顒勬煕鐎ｎ亶妯€闁诡喗绮撻弫鍌炴嚍閵夈倖鍞夐梻浣规偠閸庮噣寮插鍫熷仼闂侇剙绉甸悡娆撴倵濞戞瑯鐒藉褏鏁哥槐鎺楊敋閸涱厾浠梺鐟板槻椤戝淇婇崼鏇炵倞闁靛ě鍕啅缂傚倸鍊烽悞锕傘€冭箛娑樼婵炴垶姘ㄩ崡姘舵倵濞戞瑯鐒介柍缁樻⒐閵囧嫯绠涢幘瀛樺闯缂備讲鍋?
        // 濠德板€楁慨鐑藉磻閻愯鑰块柛锔诲幘缁犳棃鏌″鍐ㄥ闁崇懓绉电换婵嬫濞戞瑯妫ら梺鍦櫕婵炩偓闁哄矉缍佹俊鎼佸Ψ閵夘喕鐥繝纰夌磿閸嬫盯宕愰崹顕呮綎闁煎鍊愰崑鎾斥槈濞嗘瑤绶甸梺鍝ュ仒缁瑩骞冪憴鍕缂佸绨遍幐鍐⒑濮瑰洤鈧洖螞濞嗘垹鐭?disableAutoSwitch闂傚倷鐒︾€笛呯矙閹达附鍤愭い鏍仜閸ㄥ倹銇勯弽銊р姇濠殿垱鎸抽幃褰掑箒閹烘垵顬夐梺鍝勬缁绘劘褰侀梺鎼炲劘閸斿海绮婚幘缁樼厽閹烘娊宕濋幋锕€绠氶柛鎰靛枛缁€瀣亜閹捐泛浠滃ù婊冪埣閹?
        const currentSlot = timeSlots[autoSlotIndex];
        const savedSlot = timeSlots[savedIndex];
        
        // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞闁归偊鍘煎▓婊冾渻閵堝懐绠伴悗姘煎墲椤ゅ嫰姊绘担鍛婂暈闁绘娲滅槐鐐寸節閸パ冨亶闂侀潧鐗嗗Λ妤冩閻愬搫绾ч柛顐亜娴滎垳鎮┑瀣拺闁圭娴烽埥澶愭煟濡や礁濮夐柟骞垮灲楠炲鏁冮埀顒勬倷婵犲洦鐓熼柟閭﹀幖椤ュ鏌涢悢鍑ゅ姛缂佽鲸甯掕灃濠电姴鍊搁獮鎰磽娴ｈ鐓ラ柣掳鍔庣划娆愬緞閹板灚鏅滈梺鍛婂姦娴滅偤鍩㈤弴鐔虹闁瑰鍋炵亸鐗堜繆閻愬灚娅曢柛鎺撳浮椤㈡稑顭ㄩ崟顐偓娑㈡⒑闂堟稓澧曢柟鍐差樀瀹曟垿骞橀懜闈涘幑婵＄偛顑呭ù鐑剿囬锔解拺闁荤喐澹嗛幗鐘绘煟濡ゅ啫浠遍柛鈹惧亾濡炪倖宸婚崑鎾绘煙閸愬弶鎹ｅù婊勬倐椤㈡岸鍩€椤掑嫬钃熷┑鐘插亞閸氬鏌涘☉鍗炲箻闁告ɑ甯″鍝勑ч崶褍顬堥柣搴㈠嚬閸樺ジ鈥旈崘顔肩＜闁绘劗琛ラ幏濠氭煟鎼淬垻鈯曢柨鏇楁櫊瀹曨剟鎮惧畝鈧壕濂告煕鐏炲墽鎳嗛柛蹇撶焸閺屸剝鎷呴棃娑掑亾閺嶎偆鐭夌€广儱顦獮銏℃叏濮楀棗澧い鏂挎喘濮婃椽宕ㄦ繝鍐幗闂佸憡鏌ㄧ换姗€骞冨鍫熸櫆闁兼亽鍎遍～?
        // 闂傚倷绀侀幉锛勬暜濡ゅ懏鍋￠柕鍫濇缁犻箖鏌涢妷顔煎闁稿鍔戦弻鏇熺箾瑜嶇€氼厼鈻撻姀銈嗏拺闁革富鍙庡Λ搴㈢箾閹捐櫕璐＄紒顕呭弮瀹曟帒顫濋敐鍡欌偓濠氭⒑鐠恒劌鏋斿┑顕呭弮瀹曟垿骞橀弶鎴犵獮闁诲函缍嗘禍鑸电閹绢喗鈷戞慨鐟版搐婵″ジ鎮楀鐓庡箹妞ゎ亜鍟村畷鎺楁倷缁瀚介梺璇插缁嬫帡鏁冮埡鍛埞?
        if (savedSlot.disableAutoSwitch || currentSlot.disableAutoSwitch) {
          targetIndex = savedIndex;
        }
      }
    }
    
    setSelectedSlotIndex(targetIndex);
    
    // 闂傚倷鑳堕崕鐢稿疾濠婂牆鍨傞柣銏㈩焾缁犳艾顭跨捄渚剭濞存粍绮撻弻锝夊閻樺啿鏆堝┑鈩冦仠閸旀垿寮诲☉妯锋瀻婵☆垵娅ｆ禒鏉戭渻閵堝骸浜滄俊顐ｇ箞閻涱噣鍩€椤掑倹鍠愮€广儱鐗勬禍鐟邦熆閼搁潧濮囩紒鈧畝鍕厸鐎广儱娲﹂弳鈺冪磼閳ь剟宕熼娑氬幈闂佸湱鍎ら崹鑸靛緞閸曨厸鍋撶憴鍕闁绘挴鈧剚鍤曞ù鐘差儏閻愬﹪鏌嶉崫鍕跺伐濠殿喚澧楁穱濠囨倷椤忓嫧鍋撳Δ鍛；闁挎繂顦悞鍨亜閹达絾纭堕柛鏂跨У缁绘盯骞橀崘宸殺婵炲瓨绮嶉悺鏇犵不濞戙垹绠婚柟棰佺濞堫厾绱撻崒娆戝妽闁告梹鐗犻妴鍐川閼割兛姹楀┑鐐村灦濮樸劍銇欓崘宸唵闁煎摜鏁搁妴鎺旂磼閳?
    const handleVisibilityChange = () => {
      if (!document.hidden && timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 闂傚倷绀侀幉锟犳偡椤栨稓顩叉繝闈涙４閼板灝霉閿濆拋娼熷ù婊冪秺閺岀喖骞嗚閺嗚鲸銇勯妶鍛殗闁哄矉绻濆畷姗€濡歌閻撶喎鈹戦埥鍡椾簻闁诲繑绻堥崺銏ゅ箻鐠囨彃鐎銈嗗姂閸婃牠鍩涢弴銏♀拺闁告繂瀚晶鏇熴亜閿曞倷鎲鹃柕鍡楁嚇閺佸啴宕掑☉妯圭紦闂備線娼ч…鍫ュ礉鐏炶В鏋斿ù鐓庣摠閻撴洟鏌￠崒婵愬殭濠殿喒鍋撻梻浣虹帛閸╁﹪姊介崟顐劷妞ゅ繐鐗滈弫鍡椕归敐鍫殐婵″樊鍨跺娲箰鎼达絺妲堥梺鍝勭墱閸撴岸寮查崼鏇熷亹缂備焦锚濞堟粌顪冮妶鍛閻庢凹鍓濋·鍕⒒娴ｅ憡鍟為悽顖涘笒鐓ら柨鏇楀亾闁?
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    // 闂傚倷鑳堕崕鐢稿疾濠婂牆鍨傞柣銏㈩焾缁犳艾顭跨捄铏圭伇闁绘粎绮穱濠囧Χ閸屾矮澹曢柣鐔哥矌婢ф鎯勯鐐茬疇闁靛繒濮烽弳瀣煙濞堝灝鏋ょ紒鐘冲浮濮婅櫣绱掑Ο娲殝婵犵鈧櫕鍠樼€规洘鍨块弫鎰緞鐎ｎ偅鐝梻浣稿閸嬪懐鎹㈤崒鐐村€靛┑鍌氭啞閻撴洟鏌曟竟顖氬暕缁墎绱撴担闈涘闁绘搫绻濋獮鍐╃鐎Ｑ€鍋撻敃鍌氱闁哄啫鍋嗗Σ?
    const handleFocus = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 闂傚倷绀侀幉锟犳偡椤栨稓顩叉繝闈涙４閼板灝霉閿濆拋娼熷ù婊冪秺閺岀喖骞嗚閺嗚鲸銇勯妶鍛殗闁哄矉绻濆畷姗€濡歌閻撶喎鈹戦埥鍡椾簻闁诲繑绻堥崺銏ゅ箻鐠囨彃鐎銈嗗姂閸婃牠鍩涢弴銏♀拺闁告繂瀚晶鏇熴亜閿曞倷鎲鹃柕鍡楁嚇閺佸啴宕掑☉妯圭紦闂備線娼ч…鍫ュ礉鐏炶В鏋斿ù鐓庣摠閻撴洟鏌￠崒婵愬殭濠殿喒鍋撻梻浣虹帛閸╁﹪姊介崟顐劷妞ゅ繐鐗滈弫鍡椕归敐鍫殐婵″樊鍨跺娲箰鎼达絺妲堥梺鍝勭墱閸撴岸寮查崼鏇熷亹缂備焦锚濞堟粌顪冮妶鍛閻庢凹鍓濋·鍕⒒娴ｅ憡鍟為悽顖涘笒鐓ら柨鏇楀亾闁?
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    // 闂傚倷鑳堕崕鐢稿疾濠婂牆鍨傞柣銏㈩焾缁犳艾顭跨捄鐑樻拱濠殿垰銈搁弻鈩冨緞鎼淬垻銆婄紓浣割槸閻忔繈鈥旈崘顔嘉ч柛銉ｅ妽濮ｅ牆鈹戦悙鎻掓倯婵犮垺锕㈤崺鐐哄箣閿曗偓閻掑灚銇勯幒鍡椾壕闁绘挶鍊濋幃瑙勬媴閸濄儻绱為梺姹囧妽閸ㄧ敻婀侀梺缁樏肩拃锕傚疮閸モ晝纾奸弶鍫涘妿閹冲嫮绱掗崒娑樼瑲闁诡垱妫冮崹楣冨礃閼碱剛鐐曟繝鐢靛仜椤曨厽鎱ㄩ悽鍛婂亱婵°倕鎳忛崑澶愭煥濠靛棙宸濆瑙勫▕閺岀喖顢涢崱妤€鏆熼柍褜鍓欓妶鎼佸蓟濞戙垹唯鐟滃秵绂掗埡鍌樹簻闁哄倹瀵х粚鍧楁煏閸ャ劌濮嶇€殿喗鎸抽幃銏ゅ传閸曨厺绱樼紓鍌氬€烽悞锔剧矙閹烘绠繝闈涚墛椤?
    const handleRecordViewActivated = () => {
      if (timeSlots.length > 0) {
        const autoIndex = getCurrentTimeSlotIndex();
        const currentSlot = timeSlots[selectedSlotIndex];
        
        // 闂傚倷绀侀幉锟犳偡椤栨稓顩叉繝闈涙４閼板灝霉閿濆拋娼熷ù婊冪秺閺岀喖骞嗚閺嗚鲸銇勯妶鍛殗闁哄矉绻濆畷姗€濡歌閻撶喎鈹戦埥鍡椾簻闁诲繑绻堥崺銏ゅ箻鐠囨彃鐎銈嗗姂閸婃牠鍩涢弴銏♀拺闁告繂瀚晶鏇熴亜閿曞倷鎲鹃柕鍡楁嚇閺佸啴宕掑☉妯圭紦闂備線娼ч…鍫ュ礉鐏炶В鏋斿ù鐓庣摠閻撴洟鏌￠崒婵愬殭濠殿喒鍋撻梻浣虹帛閸╁﹪姊介崟顐劷妞ゅ繐鐗滈弫鍡椕归敐鍫殐婵″樊鍨跺娲箰鎼达絺妲堥梺鍝勭墱閸撴岸寮查崼鏇熷亹缂備焦锚濞堟粌顪冮妶鍛閻庢凹鍓濋·鍕⒒娴ｅ憡鍟為悽顖涘笒鐓ら柨鏇楀亾闁?
        if (!currentSlot?.disableAutoSwitch) {
          setSelectedSlotIndex(autoIndex);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('recordViewActivated', handleRecordViewActivated);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('recordViewActivated', handleRecordViewActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots, displayedGroup.id]); // 婵犵數鍋為幐鑽ゅ枈瀹ュ洦宕查柛鈩冪懅閻?timeSlots闂傚倷鐒︾€笛呯矙閹达附鍤愭い鏍ㄧ矌缁€濠囨倵閿濆骸鏋涚紒顐㈢Ч閺屾盯顢曢敐鍡欘槰闂佹寧绋撻崰鎰崲濞戙垹閱囬柕蹇婂墲濮ｅ牓姊洪崨濞楁粓宕愬Δ鍐╊潟闁哄啫鐗滈弫濠囨煟閹捐櫕鎹ｇ紒澶樺櫍濮婃椽宕ㄦ繝鍕潷闂佺粯顨嗛〃鍛粹€旈崘顔肩＜婵炴垶鍩冮弸娆撴⒑缂佹ɑ鈷掗柛妯犲啠鏋嶉柕蹇嬪€栭悡娑㈡煕鐏炲墽鐭婃い锝呭悑閵囧嫰濡烽妷锕€娅ｉ梻?

  // 婵犵數鍎戠徊钘壝洪敂鐐床闁稿瞼鍋為崑銈夋煏婵炵偓娅嗛柛瀣ㄥ姂閺屾洘绻濊箛鏇犳殸闂佺粯鎸诲ú鐔奉潖濞差亶鏁冮柕蹇婃櫆鏁堥梺璇插閸濆酣宕濋幋锕€绠氶柛鎰靛枛缁€瀣亜閹哄秶璐版俊宸灦濮婂宕掑顑藉亾閹间焦鍋ら柕濞炬櫓閺佸﹦鈧厜鍋撻柍褜鍓欏嵄闁圭増婢橀～鍛存煟濡吋鏆╅柍?
  useEffect(() => {
    if (timeSlots.length > 0 && selectedSlotIndex >= 0) {
      const savedSlotKey = `lastSelectedSlotIndex_${displayedGroup.id}`;
      localStorage.setItem(savedSlotKey, selectedSlotIndex.toString());
    }
  }, [selectedSlotIndex, timeSlots, displayedGroup.id]);

  const currentSlot = timeSlots[selectedSlotIndex];
  const currentCards = currentSlot?.cards || [];

  // 缂傚倸鍊搁崐鐑芥嚄閸洖绐楅柡鍥ュ焺閺佸洭鏌熼梻瀵割槮闁哄绶氶弻锝呂旈埀顒勬偋閸℃瑧鐭堥柨鏇炲€归悡娑㈡煕閵夋垵鎳忛幉濂告⒑?- 婵犵數鍋涢顓熸叏閹绢喖绠犻幖绮规閼版寧銇勮箛鎾跺閻庢艾顦…璺ㄦ崉閾忓湱浼囬梺绯曟櫇婵炩偓闁诡喛顫夐幏鍛圭€ｎ亙澹曢梺鍛婂姈瑜板啴鎳撻崸妤佲拺缂備焦锕╁▓鏃€绻涚拠褏鐣辨い顏勫暣瀹曟帒袙閹稿骸绗╃紒鐘崇洴楠炴ê鐣烽崶锝呬壕濠电姵纰嶉埛鎴︽煟閿濆懓瀚伴柡瀣灦缁绘盯骞撻幒鎾充淮閻庢鍣崜姘舵晬閹邦厽濯村〒姘煎灟缁辨ɑ绻?
  useEffect(() => {
    // 濠电姷顣藉Σ鍛村磻閳ь剟鏌涚€ｎ偅宕岄柡宀嬬磿娴狅妇鎷犻幓鎺戭潛缂傚倸鍊哥粔鎾敄婢跺﹦鏆︽繝濠傚枤閸氬鏌涢埄鍐夸緵婵″樊鍨跺濠氬磼濮橆兘鍋撻幖浣瑰仱闁靛ň鏅╅弫濠勨偓鍏夊亾闁告洦鍋勫宄邦渻閵堝棛澧痪鏉跨Ч瀹曟洘绻濋崶銊у幐闂佸壊鍋呯换宥呂ｉ搹鍦＜妞ゆ梹瀵ч鐘绘煙瀹勯偊鍎旈柛銊╃畺瀹曟﹢骞撻幒鏇楀亾閸ф鈷?
    const hasStatsCard = currentCards.some(card => card.type === 'stats');
    
    if (!hasStatsCard) {
      return; // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞濠电偟鍋撻悡銏ゆ⒑閺傘儲娅呴柛鐕佸灣缁骞掗弮鍌滐紳婵炶揪绲介幖顐﹀几濞嗘劑浜滈柟鎯х摠閸婃劗鈧娲╃换婵嬪极瀹ュ绀嬫い鎰靛亝濮ｅ牓姊绘担鐟邦嚋缂佸鍨剁缓浠嬪籍閸屾粎鐣舵繝銏ｅ煐閸旀牠藟閸℃稒鐓冪憸婊堝礈濞戙垹绠熼柣妤€鐗婃刊鎾煕濠靛嫬鍔滄慨锝呴叄濮婃椽宕崟顐ｆ闂佺硶鏅滈悧鏇犲弲闂佺鍕垫當婵?
    }
    
    const interval = setInterval(() => {
      setStatsUpdateTrigger(prev => prev + 1);
    }, 60000); // 60缂?
    return () => clearInterval(interval);
  }, [currentCards]);

  // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晠鏌ゆ慨鎰偓妤冨婵傚憡鐓熼柡鍐ｅ亾婵＄偛娼″畷銉╁焵椤掑嫭鈷戦柛娑橆煬濞堬絿绱掓潏銊︾闁哄懎鐖煎浠嬵敇閻斿嘲澹勯梻浣告啞濞诧箓宕滃绔洩顦规慨濠傤煼閸┾偓妞ゆ帒瀚粻浼村箹濞ｎ剙鐏い鏂跨Ч濮?
  const calculateStatsDuration = (filterActivityIds?: string[]): string => {
    const minutes = calculateStatsDurationMinutes(filterActivityIds);
    
    // 闂傚倷绀侀幖顐ょ矓閸洖鍌ㄧ憸蹇撐ｉ幇鐗堟櫢闁绘灏欓ˇ閬嶆⒑閸濆嫮袪闁告柨绉硅棟鐟滄柨顫忔繝姘劦妞ゆ帒瀚粻浼村箹缁鍣伴柡瀣墱缁辨挻鎷呴幓鎺嶅?
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柟缁㈠櫘閺佸淇婇妶鍌氫壕濡炪倖娲╃紞浣割嚕閹绢喗鍋愰柧蹇ｅ亝椤撳綊姊绘担鍛婂暈妞ゃ劍鍔楀Σ鎰板即閻斿憡鐝烽梺鍝勭▉閸樹粙宕曞澶嬬厱闁哄洢鍔屾禍婊堟煛娴ｅ摜鍩ｉ柟?
  const getReferencedContent = (
    sourceType: 'dailyReview' | 'weeklyReview' | 'monthlyReview',
    dateOffset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth',
    questionId: string
  ): { question: string; answer: string } | null => {
    // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晛鈹戦悩宕囶暡闁稿骸瀛╅妵鍕籍閸屾稒鐝梺鎼炲妼閵堟悂寮婚敓鐘茬闁挎洍鍋撻柛鏃€绮嶇换婵嬪焵?
    const getTargetDate = (): string => {
      const today = new Date();
      
      if (sourceType === 'dailyReview') {
        if (dateOffset === 'today') {
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        } else if (dateOffset === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        }
      } else if (sourceType === 'weeklyReview') {
        // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎閻庢艾顦伴妵鍕箳閸℃ぞ澹曢梻浣烘嚀閸熷灝螞濠靛宓侀悗锝庡枛閸愨偓闂佹寧鏌ㄦ晶浠嬪箟椤忓牊鈷戦柛娑橈功閳笺倝鏌涢弬鍧楊€楅柍缁樻崌楠炲鎮╅悽鐢垫殽婵＄偑鍊栭崹鐓庘枖閺囥埄鏁傞柛妤冨剱閻斿棝鏌涢妸锔锯姇婵炲懏姊荤槐鎺撴綇閵娧勫櫚閻庤娲忛崝鎴炰繆閹间礁围闁搞儲婀圭槐姗€姊?
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 闂傚倷绀侀幉锛勭矙韫囨稑绀夌€广儱鎲樺☉銏犵厸闁告侗鍠栨禍閬嶆煟閻斿摜鎳冮悗姘煎櫍瀵娊寮撮悜鍡欏數闁荤姴鎼幖顐︻敂椤愶附鐓?
        const monday = new Date(today);
        monday.setDate(today.getDate() + diff);
        
        if (dateOffset === 'lastWeek') {
          monday.setDate(monday.getDate() - 7);
        }
        
        return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (sourceType === 'monthlyReview') {
        // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎閻庢艾顦伴妵鍕箳瀹ュ洤濡界紓浣哄У閸ㄥ潡寮婚悢琛″亾濞戞瑯鐒藉邪鍛＜婵°倐鍋撻柛濠傜仢椤曪綁鎮界粙鍧楀敹闂侀潧楠忕槐鏇㈠汲閻樼數纾藉ù锝堫嚃濞堛垽鏌涜箛鏃傘€掔紒顔规櫇閳ь剚绋掗敋缂?
        let year = today.getFullYear();
        let month = today.getMonth() + 1;
        
        if (dateOffset === 'lastMonth') {
          month -= 1;
          if (month === 0) {
            month = 12;
            year -= 1;
          }
        }
        
        return `${year}-${String(month).padStart(2, '0')}-01`;
      }
      
      return '';
    };
    
    const targetDate = getTargetDate();
    if (!targetDate) return null;
    
    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖淇婇姘辨癁闁稿鎹囬幃浠嬪垂椤愩垺鐣紓鍌欓檷閸斿秹鎮￠敓鐘茬畾闁告劦鍠栫粈瀣亜閹板墎鎮兼い锔哄劜娣?
    let review: DailyReview | WeeklyReview | MonthlyReview | undefined;
    
    if (sourceType === 'dailyReview') {
      review = dailyReviews.find(r => r.date === targetDate);
    } else if (sourceType === 'weeklyReview') {
      review = weeklyReviews.find(r => r.weekStartDate === targetDate);
    } else if (sourceType === 'monthlyReview') {
      review = monthlyReviews.find(r => r.monthStartDate === targetDate);
    }
    
    if (!review) return null;
    
    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖淇婇姘辨癁闁稿鎹囬幃浠嬪垂椤愩垺鐣紓鍌欓檷閸斿秹鎮￠敓鐘茬畾闁告劦鍠栫粈瀣亜閺嶃劌鍠曠紒槌栦簼娣囧﹪顢曢妶鍜佹毉闂佹寧宀搁弻鐔兼煥鐎ｎ亶妫嗙紓渚囧枤閺佽顕ｉ鈧崺鈧い鎺戝閳?
    const answer = review.answers.find(a => a.questionId === questionId);
    if (!answer) return null;
    
    return {
      question: answer.question,
      answer: answer.answer
    };
  };

  // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晠鏌ゆ慨鎰偓妤冨婵傚憡鐓熼柡鍐ｅ亾婵＄偛娼″畷銉╁焵椤掑嫭鈷戦柛娑橆煬濞堬絿绱掓潏銊︾闁哄懎鐖煎浠嬵敇閻斿嘲澹勯梻浣告啞濞诧箓宕滃绔洩顦规慨濠傤煼閸┾偓妞ゆ帒瀚粈宀勬煥濞戞ê顏い锔规櫊閺屸剝寰勯崱妯荤彆闂佸搫琚崝宀€鍙呴梺鍝勭▉閸樿偐绮堥崱娑欑厱闁斥晛鍟伴埊鏇㈡倵濞堝灝寮柡灞稿墲閹峰懐绮欑捄銊ф晨缂?
  const calculateStatsDurationMinutes = (filterActivityIds?: string[]): number => {
    // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷锝呭妞も晛鍢查埞鎴︽偐閹绘巻鍋撻懜鐢殿洸妞ゆ牜鍋為悡鐔兼煏婵炲灝鍔氭い蹇婃櫇缁辨帗娼忛妸銉т桓闂侀€涚┒閸斿酣鍩€椤掑﹦绉靛ù婊勭箘閳ь剚淇虹亸娆戞閹惧瓨濯撮悷娆忓闂夊秴鈹戦悙纰樻嫛闁稿锕ら锝夘敋閳ь剙鐣锋總绋垮嵆闁绘洖鍊婚崥?
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const currentTime = Date.now();

    // 缂傚倸鍊烽悞锔剧矙閹烘鍎庢い鏍仜閻掑灚銇勯幒鍡椾壕濡炪倧瀵岄崰姘跺礆閹烘鍐€闁靛鍎崇粣鐐烘⒑閸愬弶鎯堥柛鐕佸灦閹箖鏌嗗鍡椾化婵炶揪缍€椤娆㈤懠顒傜＝?
    const dayLogs = logs.filter(log => {
      return log.startTime >= startOfDay.getTime() && log.startTime <= endOfDay.getTime();
    });

    // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晛鈹戦悩瀹犲缂佺姵鍨圭槐鎾存媴閼测剝鍨胯棟鐟滄柨顫忔繝姘劦妞ゆ帒瀚粈宀勬煥濞戞ê顏い锔规櫇缁辨挻鎷呴崜鍙壭ч柣銏╁灱娴滅偛危?
    let totalSeconds = 0;

    // 缂傚倸鍊搁崐鐑芥嚄閸洖绐楅柡鍥ュ焺閺佸洨绱掔€ｎ偒鍎ラ柛鐔锋嚇閺岀喓绱掑Ο铏诡儌闂佸搫妫欏畝鎼佸蓟閻旇　鍋撳☉娅亝鎱ㄦ径瀣闁割偆鍠庨悘鈺呮煙瀹勯偊鍎旂€殿喖澧庨幑鍕Ω椤?
    dayLogs.forEach(log => {
      // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻忕偞鍎抽娑㈡⒑閸涘﹥瀵欓柛娑卞枤閳ь剦鍘界换娑氣偓娑欘焽閻﹥淇婇锝囨创闁诡喗妞介、鏇㈡晜閻ｅ苯濮峰┑鐘灱濞夋盯顢栭崶顒€鍨傞柤娴嬫櫇绾惧吋绻涢幋鐐垫噭閻庢碍娲滅槐鎺撴綇閵娧呯杽閻庤娲╃紞渚€銆侀弮鍫濆耿婵炲棗绻掗崢鐑芥⒑閼姐倕小缂佽翰鍊楅幑銏犫攽鐎ｎ亞鍔﹀銈嗗坊閸嬫挻銇勯敂璇叉珝闁硅櫕鐟╅獮瀣晜閽樺澹勯梻浣告啞濞诧箓宕滃☉銏犲瀭闁兼祴鏅濈壕?
      if (filterActivityIds && filterActivityIds.length > 0) {
        if (filterActivityIds.includes(log.activityId)) {
          totalSeconds += log.duration;
        }
      } else {
        // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞濠电偟鍋撻悡銏ゆ⒑閺傘儲娅呴柛鐕佸灣缁骞掑Δ浣镐化婵炶揪绲块…鍫ュ煕閺冨牊鐓熼柕鍫濇噺椤ョ姷绱掗鈧褔鍩ユ径鎰厬闁宠桨妞掓竟鏇熺節閵忥絽鐓愮紒瀣尵缁牊寰勫畝鈧壕钘壝归敐鍛儓闁哄鐟﹂妵鍕箻鐎涙ê鈧劖顨ラ悙鑼ч柛鈹惧亾濡炪倖甯掔€氼剛鈧艾顦…璺ㄦ崉閸濆嫮妲伴梺鍝ュ仜婢у酣骞?
        totalSeconds += log.duration;
      }
    });

    // 缂傚倸鍊搁崐鐑芥嚄閸洖绐楅柡鍥ュ焺閺佸洨绱掔€ｎ偒鍎ユ繛闂村嵆閺屻劌鈹戦崱妯烘闂傚鍓﹂崜鐔奉嚕閸洖鐓涢柛灞剧矤閻忓崬顪冮妶鍐ㄧ仾闁搞劌娼￠獮鍡涘礃椤旇偐顦板銈呯箰濡盯鎮伴妷鈺傜厽?
    if (activeSessions && activeSessions.length > 0) {
      activeSessions.forEach(session => {
        // 濠电姷顣藉Σ鍛村磻閳ь剟鏌涚€ｎ偅宕岄柡宀嬬磿娴狅妇鎷犻幓鎺戭潚缂傚倷娴囨ご鍛婄珶閸℃稑绠柣妯荤ゴ閺€浠嬫煕閵夛絽澹夐柨鏇炲€归悡鏇熸叏濡搫鈷旈柣锝堥哺缁绘繈鍩€椤掑嫷鏁傞柛銉ｅ劙濮规姊洪悷鏉库挃闁稿鍔嶇粋?
        if (session.startTime >= startOfDay.getTime() && session.startTime <= endOfDay.getTime()) {
          let shouldCount = false;
          
          if (filterActivityIds && filterActivityIds.length > 0) {
            shouldCount = filterActivityIds.includes(session.activityId);
          } else {
            shouldCount = true;
          }
          
          if (shouldCount) {
            // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晝绱撴担璇＄劷妞も晝鍏橀獮鏍ㄦ綇閸撗咃紵缂佺偓宕橀褔鍩為幋锔绘晩缁炬澘宕崜浼存⒑缁洘娅呴柣顓炲€块獮鍐箮閽樺楠囬梺鍦焾濮橈箓宕ラ锔解拺婵懓娲ゆ俊濂告倵濮樼厧骞栨い顏勫暣瀹曟帡鎮欑划瑙勫闂備礁鎲￠悧顓犳閺囩姷鐭嗛柛鏇ㄥ幘绾剧厧顭跨捄渚剰闂佸弶绮庣槐?
            const sessionDuration = Math.floor((currentTime - session.startTime) / 1000);
            totalSeconds += sessionDuration;
          }
        }
      });
    }

    // 闂備礁鎼ˇ顐﹀疾濠婂牆钃熼柕濞垮剭濞差亜鍐€妞ゆ挾鍋熼ˇ顐︽⒑缁洖澧茬紒瀣笧閳ь剚顔栭崣鍐蓟?
    return Math.floor(totalSeconds / 60);
  };

  // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞濠电偟鍋撻悡銏ゆ⒑閺傘儲娅呴柛鐕佸灣缁骞掑Δ浣哄幐闂佸憡鍔戦崝搴ㄥ春閿濆棔绻嗘い鎰╁灮娴犮垽鏌嶇紒妯诲磳鐎规洖缍婇、鏇㈡晲閸♀晛鏅欓梻鍌欒兌椤㈠﹪顢氶弽顓為棷妞ゆ牗绮嶉～鏇熺節闂堟侗鍎忛柛娆忥躬閺屾盯骞樺鐐樂缂侇喚鏁哥槐鎾存媴閸濄儳鍔┑鐐叉嫅缁查箖骞堥妸鈺佺濞达絽鎽滈悾?
  if (timeSlots.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#faf9f6]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">No scene configuration yet.</p>
          {onConfigureSlots && (
            <button
              onClick={onConfigureSlots}
              className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              Open settings
            </button>
          )}
        </div>
      </div>
    );
  }

  // 闂傚倷绀侀幉锟犮€冮幇顔筋潟闁哄洨鍠愬▍鐘绘煛瀹ュ骸骞栫紒鈧径鎰厪濠电偛鐏濋埀顒侇殘缁瑦绻濋崒銈囧數闁荤姴鎼幖顐︻敂椤愶附鐓?
  const handleCardAction = (action: SceneCardData['action'], autoEnterFocus?: boolean) => {
    // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞闁归偊鍓欏宄邦渻閵堝棛澧柣顐ｇ⊕瀵板嫮浠﹂幆褜鈧盯姊虹紒姗嗘當闁绘搩鍓氶幏鍛村礈閹绘帗顓块梻濠庡亜濞层垽宕曞畷鍥╃焼濠㈣泛艌濡插牓鏌熼幆褏鎽犻柣鎾卞劚閳规垿顢欑憴鍕彆闂佺懓鍢查幊搴ㄢ€﹂妸鈺佸窛闂侇叏闄勯拺澶愭⒒娴ｈ鍋犻柛鏂跨焸椤㈡牠宕卞顫秮瀹曨偊濡烽敃鈧娑㈡⒑閺傘儲娅呴柛鐕佸灦钘濈憸鏃堝蓟閻旇　鍋撳☉娆樼劷濠⒀屼簽缁辨帡宕滄担鍛婄亪閻庤娲樼换鍫ュ箖濠婂牆鐐婇柍鍝勫枤濡茬兘姊绘担鍛婂暈閻㈩垱顨婇幃鐑藉Ω閳哄倸鍓梺缁樻煥閸氬宕戦妸鈺傜厪濠电偛鐏濇竟鍌氼熆鐠虹儤婀板┑顖氥偢閺屸剝寰勬繝鍕檸濡炪値鍋嗘繛鈧柡?
    if (sceneCardTimerMode === 'backfill' && (action.type === 'startTimer' || action.type === 'startTodo')) {
      if (!onAddLog) {
        addToast('error', 'The selected activity could not be found.');
        return;
      }

      // 闂備浇宕垫慨宕囨閵堝洦顫曢柡鍥ュ灪閸嬧晠鏌ゆ慨鎰偓鏍磻濮椻偓閺屾洘寰勫Ο鐓庡弗闂佸摜鍋涢悥濂稿蓟閿濆惟闁靛鍎烘禒鎯р攽閿涘嫬浠滈柛濠傜仢椤繘鎳￠妶鍜佹闁诲函缍嗘禍鐐参ｅú顏呪拺闁硅偐鍋涢崝銉╂煙濞茶绨芥俊鍙夊姍閹囧醇閵忊晜绁梺鍦帶閻°劎鎹㈤崟顖涘仭闁归偊鍏樺Σ鍫ユ煙缂併垹鐏犲ù婊堢畺濮婃椽宕崟鍨紖闂侀潧鐗嗘鎼佸极瑜版帗鍋℃繝濠傛噹椤ｅ吋绻涢崣澶岀煂闁告帗甯℃俊鎼佸煛娴ｆ椽鐛撻梻浣虹帛閺屻劑宕查弻銉﹀亗闁稿瞼鍋為悡鐔哥節婵犲倸顏紒璺哄级缁绘繈鍩€?
      const now = Date.now();
      const sortedLogs = [...logs].sort((a, b) => b.endTime - a.endTime);
      const lastLog = sortedLogs[0];
      const startTime = lastLog ? lastLog.endTime : now - 3600000; // 婵犳鍠楃敮妤冪矙閹烘せ鈧箓宕奸妷顔芥櫍?闂備浇顕х换鎰崲閹邦喗宕查柟瀛樼箥濞撳鏌涘畝鈧崑娑氱矆?
      
      // 闂傚倷绀侀幉锟犲垂闂堟党娑樜旈崥钘夋喘椤㈡绗熸繝鍕厬闂備礁鎲″ú锕傚磻閹惧墎绀婇柡宥庡幗閻撴洟鐓崶銊﹀鞍闁革絾妞介弻锟犲幢濞嗗繑鐏堝Δ?
      const prefilledData: { categoryId?: string; activityId?: string; linkedTodoId?: string } = {};
      
      if (action.type === 'startTimer' && action.activityId && action.categoryId) {
        const category = categories.find(c => c.id === action.categoryId);
        const activity = category?.activities.find(a => a.id === action.activityId);
        
        if (activity && category) {
          prefilledData.categoryId = category.id;
          prefilledData.activityId = activity.id;
        } else {
          addToast('error', 'The selected activity could not be found.');
          return;
        }
      } else if (action.type === 'startTodo' && action.todoId) {
        const todo = todos.find(t => t.id === action.todoId);
        
        if (todo) {
          prefilledData.linkedTodoId = todo.id;
        } else {
          addToast('error', 'The selected activity could not be found.');
          return;
        }
      }
      
      // 闂備浇宕垫慨鎾敄閸涙潙鐤ù鍏兼綑閺嬩線鏌曢崼婵囧闁稿锕㈤弻鏇熷緞濡厧甯ラ梺鍝ュ仜閻栧ジ寮诲☉銏犵睄闁稿本纰嶉悘鍡涙⒑?
      onAddLog(startTime, now, prefilledData);
      return;
    }

    // 濠电姵顔栭崰妤冩崲閹邦喚绀婇柍褜鍓氶妵鍕箻鐎涙ê鈧劗鈧鍣崳锝夊箠濠婂牊鍎嶉柛鏇ㄤ簽椤︼附銇勯弴顏嗙К缂佺姵鐩俊鐤槾闁绘稏鍎靛娲川婵犲海鍔烽梺鍝ュУ閸旀洟鏁冮姀锛勭懝闁逞屽墴瀵宕ㄩ弶鎴濆挤闂婎偄娲﹀ú鏍博?
    switch (action.type) {
      case 'startTimer':
        if (action.activityId && action.categoryId) {
          const category = categories.find(c => c.id === action.categoryId);
          const activity = category?.activities.find(a => a.id === action.activityId);
          
          if (activity && category) {
            onStartActivity(activity, category.id, autoEnterFocus);
          } else {
            addToast('error', 'The selected activity could not be found.');
          }
        }
        break;
      case 'startTodo':
        if (action.todoId && onStartTodoFocus) {
          const todo = todos.find(t => t.id === action.todoId);
          
          if (todo) {
            onStartTodoFocus(todo, autoEnterFocus);
          } else {
            addToast('error', 'The selected activity could not be found.');
          }
        }
        break;
      case 'toggleCheck':
        if (action.checkItemId) {
          handleToggleCheckItem(action.checkItemId, action.checkActionMode);
        }
        break;
      case 'navigate':
        if (action.targetView) {
          handleNavigation(action.targetView);
        }
        break;
    }
  };

  // 闂傚倷绀侀幖顐ょ矓閻戞枻缍栧璺猴功閺嗐倕霉閿濆牆鈧粙鎮㈤悡搴ｅ姶闂佸憡鍔忛弲婵嬪礄閿熺姵鈷戦柛婵嗗閺嗘棃鏌涙惔銏″唉妞?ID 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔句粶闁绘梻鍘ч悞娲煕閹般劍娅囬柛鎴斿墲缁绘盯鏁愰崨顔绢槺闂佸憡鎸荤换鍐偓闈涖偢瀹曘劎鈧稒蓱濞呮牠姊洪崜鎻掍簴闁搞劍妞藉瀹犵疀閹句胶鎳撻…銊╁礃椤曞應鍋撳Δ鍛厱婵﹩鍓﹂崕鎴︽煃瑜滈崜娑€佹繝鍥风稏濠㈣泛谩?dailyReview 闂傚倷娴囧銊╂嚄閼稿灚娅犳俊銈傚亾闁伙絽鐏氱粭鐔煎焵椤掑嫬鏋?
  const getCheckTemplateMeta = (
    checkItemId: string
  ): { content: string; category: string; manualMode: 'binary' | 'count'; targetCount: number } | null => {
    for (const template of checkTemplates) {
      const item = template.items.find(i => i.id === checkItemId);
      if (item) {
        const manualMode = item.type === 'auto'
          ? 'binary'
          : (item.manualMode === 'count' ? 'count' : 'binary');
        const targetCount = manualMode === 'count'
          ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
          : 1;
        return {
          content: item.content,
          category: template.title,
          manualMode,
          targetCount
        };
      }
    }
    return null;
  };

  // 闂傚倷绶氬鑽ゆ嫻閻旂厧绀夌€广儱娲犻崑鎾诲垂椤愶絿娈ら梺閫炲苯澧叉い顐㈩槺閸犲﹤顓奸崨鍌涚洴閸╋繝宕ㄩ鐙€鍞撮梻渚€娼чˇ顓㈠磹濞戙垹鍌ㄦい鎺戝閻撴盯鎮橀悙棰濆殭闁告梹绮岄…璺ㄦ喆閸曟儼鈧法鈧娲滄慨楣冨Φ閹版澘绠抽柟瀛樼箚缁佹挳姊绘担鍦菇闁告柨鐬奸埀顒佸嚬閸樿壈鐏嬮梺鍐叉惈閸燁垳鈧碍鑹捐灃闁挎繂鎳庨弳鏃堟煃瑜滈崜娆戠矓鐠轰綍锝夊箛閺夋娼婇梺缁橆焽閺佹悂鍩炲☉銏♀拺闁圭娴烽埥澶愭煟濡も偓閹虫劕危閹伴偊鏁囬柕蹇曞Х椤?id闂傚倷鐒︾€笛呯矙閹达附鍤愭い鏍仜鐟欙箓鎮楅敐搴″幋闁稿鎸惧☉鐢稿椽娴ｅ湱绉烽梺璇查閻忔氨鍒掗幘宕囨殾婵せ鍋撶€规洏鍔戦、妯款槻闁哄拑缍佸娲箹閻愭彃濮㈤梺绋款儍閸婃繈宕洪埀顒併亜閹达絾顥夊ù婊堢畺濮?
  const findCheckItemIndexInReview = (review: DailyReview, checkItemId: string): number => {
    const checkItems = review.checkItems || [];
    const idMatchedIndex = checkItems.findIndex(item => item.id === checkItemId);
    if (idMatchedIndex >= 0) {
      return idMatchedIndex;
    }

    const templateMeta = getCheckTemplateMeta(checkItemId);
    if (!templateMeta) {
      return -1;
    }

    // 闂傚倷鑳堕…鍫㈡崲閹扮増鍋嬪┑鐘插閸嬫捇宕归銈囩厜婵犵鈧剚鍤熷ù鐙呯畵閹稿﹥寰勭仦绋夸壕闁煎鍊楃壕?+ 闂傚倷绀侀幉锟犲礉閺囥垹绠犻幖鎼厛閺佸﹪鏌熼悧鍫熺凡鏉╂繈鎮楅獮鍨姎閻庢凹鍓涘Σ鎰邦敆閸曨剛鍘搁悗骞垮劚濞层倗鏁崼鏇熷€堕煫鍥风到濞呭秹鏌＄仦鏂ゅ伐妞ゆ捁澹堢粻娑㈠即閻欌偓濡茬兘姊婚崒娆戣窗闁告挻鐟╅幃妯衡攽鐎ｎ亜鍋嶉梺闈涚墕濡盯鍩㈤弮鍌楀亾楠炲灝鍔氶柟鍐茬箻瀹曟劙鏌嗗鍡欏幈闂佸湱鍎ら崹鍫曀夐悩鐢电＜妞ゆ棁鍋愭晥閻庤娲忛崕铏閿曞倹鍤嶉柕澶堝劗閸嬫捇骞庨懞銉у幐闂佸憡鍔х粻鎴﹀礉閵夛负浜滈柡鍥╁仧閿涘秹鏌熸搴♀枅妞ゃ垺绋戦～婵嬵敆閸屾氨鍘撻梻?
    const categoryAndContentMatchedIndex = checkItems.findIndex(item =>
      item.category === templateMeta.category && item.content === templateMeta.content
    );
    if (categoryAndContentMatchedIndex >= 0) {
      return categoryAndContentMatchedIndex;
    }

    // 闂傚倷绀侀幉锟犲礉閺囩姷鐭撻柣銏㈩暯閸嬫捇宕归銈囩厜閻庤娲橀敃銏犵暦閵娾晩鏁囩憸宥夊疾閿濆鈷戠紒瀣硶缁犺尙绱掗鑲╃伇闁兼椽浜堕獮搴ㄦ寠婢跺矈妲洪柣鐔哥矌婢ф鏁幒鏃€鏆滈柟鎯板Г閻撱儲绻涢幋鐑嗙劸閻庢矮鍗抽弻娑橆潩椤掑鍓抽梺閫炲苯澧繝鈧柆宥呯疇闁圭偓鍓氶崯鍛攽閻樺疇澹橀柣顓燁殜閺屾稑鈻庤箛锝喰у┑鐐茬墕閻栧ジ寮婚悢鐑樺珰闁炽儴娅曢悘鎾绘倵鐟欏嫮鎽冨ù婊庡墯缁?category 闂傚倷鐒﹂惇褰掑礉瀹€鈧埀顒佸嚬閸欏啫鐣烽弴锛勭杸婵炴垶顭囬ˇ?
    return checkItems.findIndex(item => item.content === templateMeta.content);
  };

  const getCountState = (item: CheckItem) => {
    const target = Math.max(1, Math.floor(item.targetCount || 1));
    const currentRaw = typeof item.currentCount === 'number'
      ? item.currentCount
      : (item.isCompleted ? target : 0);
    const current = Math.min(target, Math.max(0, Math.floor(currentRaw)));
    return {
      current,
      target,
      isCompleted: current >= target
    };
  };

  // 闂傚倷鐒﹂惇褰掑垂婵犳艾绐楅柟鐗堟緲閸ㄥ倹鎱ㄥΟ鎸庣【缂侇偄绉归弻鏇熷緞濞戞氨鏆犻悶姘缁绘盯骞嬮悙瀛樺剮闂佸憡顭堝Λ鍕亱闂佸啿鎼崯顖溾偓姘哺閺岀喖顢涢崱妤€鏆熼柍褜鍓濆畷鐢垫閹惧瓨濯寸紒瀣儥娴犲ジ姊虹拠鈥虫灍闁瑰憡鎮傞敐鐐哄閵堝憘銊︺亜椤撶喎鐏ラ柡鍜佸幘缁辨捇宕掑顒佺亾闂侀潻缍嗛崹鍐参ｉ幇顑芥瀻闁规儳纾鍥⒑闂堟侗妾у┑鈥虫喘閹儵宕￠悘鑽ゆ嚀椤劑宕橀鍛亾濡ゅ啰纾界€广儱鎷嬮崕鏃傗偓瑙勬礃缁矂顢樻總绋垮耿婵鐗忕粈鍡涙⒑閼姐倕孝婵炲眰鍔戝畷鎴﹀箻閻熺増娈查梻鍌欑閹碱偊藝椤栨凹鐒介柨鐔哄Т閸屻劑鏌曢崼婵囧窛缁惧墽鍋撻妵鍕即閻愭惌妫ょ紓浣插亾?
  const buildCheckCategorySyncMap = (): { [category: string]: boolean } => {
    const syncMap: { [category: string]: boolean } = {};
    checkTemplates
      .filter(template => template.enabled && template.isDaily)
      .sort((a, b) => a.order - b.order)
      .forEach(template => {
        syncMap[template.title] = template.syncToTimeline || false;
      });
    return syncMap;
  };

  // 闂傚倷鐒﹂惇褰掑垂婵犳艾绐楅柟鐗堟緲閸ㄥ倹鎱ㄥΟ鎸庣【缂侇偄绉归弻鏇熷緞濞戞氨鏆犻悶姘缁绘盯骞嬮悙瀛樺剮闂佸憡蓱閸庢娊鍩㈤幘璇茬闁挎洍鍋撶紒顐㈢Ч閺屾洘寰勫Ο鐓庡弗闂佹悶鍊х粻鎴︹€旈崘顔嘉ч柛銉厛娴犙呯磽娴ｄ粙鍝洪柣鐔叉櫅椤曪綁宕奸弴鐐嶃劑鏌ㄩ弬鍨挃闁糕晛绉电换娑氣偓娑欘焽閻﹤螖閻樺弶鎲哥紒杈╁仧閳ь剨缍嗛崰鏍矆閸懇鍋撻獮鍨姎婵☆偅鐟╅弫宥嗗緞閹邦厼浠梺鎼炲劗閺呮稒绂嶆ィ鍐╁殙闁冲搫鎳忛悡娑橆熆鐠虹尨鏀婚柛瀣ㄥ劦閺屾稑螣缁嬪簱鍋撳Δ鍐╊潟闁哄啫鐗滈弫瀣煕閳╁啰鎳呮い?
  const buildDailyCheckItems = (): CheckItem[] => {
    const checkItems: CheckItem[] = [];

    checkTemplates
      .filter(template => template.enabled && template.isDaily)
      .sort((a, b) => a.order - b.order)
      .forEach(template => {
        template.items.forEach(item => {
          const type = item.type || 'manual';
          const manualMode = type === 'manual'
            ? (item.manualMode === 'count' ? 'count' : 'binary')
            : undefined;
          const targetCount = type === 'manual'
            ? (manualMode === 'count'
              ? Math.max(1, Math.floor(Number(item.targetCount) || 1))
              : 1)
            : undefined;
          checkItems.push({
            id: item.id || crypto.randomUUID(),
            category: template.title,
            content: item.content,
            icon: item.icon,
            uiIcon: item.uiIcon,
            isCompleted: false,
            type,
            manualMode,
            currentCount: type === 'manual' ? 0 : undefined,
            targetCount,
            autoConfig: item.autoConfig
          });
        });
      });

    return checkItems;
  };

  // 闂傚倷鐒﹂惇褰掑垂婵犳艾绐楅柟鐗堟緲閸ㄥ倹鎱ㄥΟ鎸庣【缂侇偄绉归弻鏇熷緞濞戞氨鏆犻悶姘缁绘盯骞嬮悙瀛樺剮闂佸憡蓱閸庢娊鍩㈤幘璇茬婵犲灚鍔曞▓銊╂⒑閸濆嫭宸濋柛搴㈠姍瀹曠敻濡堕崱鏇犵畾濡炪倖鐗楅〃鍛櫠閸欏绡€闁靛繆妲呴悞鍓х磼閻樺磭娲存い銏℃礋婵″爼宕ㄩ鐑嗗妧闂傚倷鐒︾€笛呯矙閹达附鍋嬪┑鐘插亞閻掍粙姊婚崼鐔衡枔闁衡偓閿曞倹鐓欓梺顓ㄧ細缁ㄤ粙鏌ら悷鏉库挃闁瑰弶鎮傞幃褔宕奸悢椋庮暡濠电姭鎷冮崨顓涙瀰閻庢鍣崳锝嗕繆閻戣姤鏅濋柍褜鍓濋。鎸庣節绾版ɑ顫婇柛顭戜邯瀹曟粌鈹戦崱鈺冨數濠殿喗銇涢崑鎾绘煛鐏炴枻宸ユい鎾炽偢瀹曞爼鍩￠崒婧惧亾椤撱垺鈷?
  const buildDailyTemplateSnapshot = () => {
    return reviewTemplates
      .filter(t => t.isDailyTemplate)
      .sort((a, b) => a.order - b.order)
      .map(t => ({
        id: t.id,
        title: t.title,
        questions: t.questions,
        order: t.order,
        syncToTimeline: t.syncToTimeline
      }));
  };

  // 缂傚倸鍊搁崐鐑芥嚄閸洖绐楃€广儱娲ㄩ崡姘舵煙缂併垹鏋涚紒鈧崱妯肩闁瑰鍎愰悞鐣岀磼閹插鐣甸柡宀嬬節瀹曟﹢鏁冮埀顒勫礉濠婂啠鏀芥い鏂挎惈閳ь剚绻堝顐㈩吋閸涱垱娈曢梺閫炲苯澧撮柛銊﹀劤铻ｉ柤濮愬€愰弨鍐测攽閻樼粯娑ф俊顐ｎ殜閹線宕奸弴鐔哄幈濠殿喗顭囬崢褎绂嶅┑鍥︾箚闁绘劖褰冮埀顒€鐏濋～蹇涙嚒閵堝拋妫滈柣搴秵閸犳牞銇愬▎鎾粹拺闁告稑锕ㄦ竟姗€鏌￠崼顐㈠⒋妞ゃ垺顨婇幃娆撳传閸曨収鍚嬮梻渚€鈧偛鑻晶瀛樹繆椤愶紕绐旈柛鈹惧亾濡炪倖甯掗崐鐢稿磻閹炬枼妲堟繛鍡樕戦悾宄邦渻?
  const createDailyReviewFromTemplates = (dateStr: string): DailyReview => {
    const now = Date.now();
    return {
      id: crypto.randomUUID(),
      date: dateStr,
      createdAt: now,
      updatedAt: now,
      answers: [],
      checkItems: buildDailyCheckItems(),
      checkCategorySyncToTimeline: buildCheckCategorySyncMap(),
      templateSnapshot: buildDailyTemplateSnapshot()
    };
  };

  // 闂傚倷鑳堕…鍫㈡崲閹烘鍌ㄧ憸鏃堛€佸▎鎾崇疀闁哄鐏濋崑宥夋⒑缁洖澧叉い銊ユ嚇閹风儤寰勯幇顓犲幐闂佸憡鍔х粻鎴﹀礉濠婂啠鏀芥い鏂挎惈閳ь剚绻堝顐㈩吋閸滀焦鍍垫繛鎴炴⒐閿氭い锔垮嵆閳ユ牠宕堕鈧粻娑欍亜閹捐泛娅忔俊宸灦濮婂宕掑顑藉亾婵犳澶愬箛閻楀牏鍘愰梻渚囧墮缁夊鎲撮敃鍌涘€堕柣鎰祷濡炬悂鏌涢弬鍨伃婵﹥妞藉鍓佹崉閵婃劑鍊濋弻锝夊Χ閸涱噮妫＄紓浣割儏椤︿即骞嗛弮鍫濈厱婵炴垶顨堢粣鏃傗偓娈垮枛閻栫厧鐣疯ぐ鎺濇晩闁芥ê顦扮粭搴ㄦ⒒?
  const normalizeDailyReviewForScene = (review: DailyReview): DailyReview => {
    let updatedReview = review;

    if (!updatedReview.checkCategorySyncToTimeline) {
      const syncMap = buildCheckCategorySyncMap();
      const itemCategories = (updatedReview.checkItems || [])
        .map(item => item.category)
        .filter((category): category is string => Boolean(category));
      itemCategories.forEach(category => {
        if (typeof syncMap[category] === 'undefined') {
          syncMap[category] = false;
        }
      });
      updatedReview = {
        ...updatedReview,
        checkCategorySyncToTimeline: syncMap
      };
    }

    if (!updatedReview.templateSnapshot) {
      updatedReview = {
        ...updatedReview,
        templateSnapshot: buildDailyTemplateSnapshot()
      };
    }

    return updatedReview;
  };

  // 婵犵數濮伴崹鐓庘枖濞戞埃鍋撳鐓庢珝妤犵偛鍟换婵嬪炊瑜忛惈鍕⒑闂堟侗妯堥柣鎾崇墦瀹曠敻鏁冮崒娑氬幍闂佸壊鐓堥崑鍛焊椤撶姭鍋?
  const handleToggleCheckItem = (
    checkItemId: string,
    actionMode: SceneCardData['action']['checkActionMode'] = 'toggle'
  ) => {
    // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷锝呭妞も晛鍢查埞鎴︽偐閹绘巻鍋撻懜鐢殿洸妞ゆ牜鍋為悡鐔兼煏婵炲灝鍔氭い蹇ｄ簼娣囧﹪顢曢悢鍛婄彋閻庢鍠氶弫濠氬箖閵堝纾兼繝濠傛媼濡插崬鈹戦悙鑸靛涧缂傚秮鍋撳┑鐐差槹濞茬喎顕ｉ锕€围濠㈣泛锕ら悵妯侯渻閵堝棗鍧婇柛瀣尰缁绘繈鍩€椤掑嫬绠绘い鏃囧亹閻嫰姊洪崜鎻掍簼婵炲弶锕㈤弫宥夋偄閸忚偐鍙?
    const today = new Date();
    const dateStr = getLocalDateStr(today); // YYYY-MM-DD

    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖淇婇婵嗗惞妞も晛鍢查埞鎴︽偐閹绘巻鍋撻懜鐢殿洸妞ゆ牜鍋為悡?DailyReview
    let todayReview = dailyReviews.find(r => r.date === dateStr);

    // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍏橀弸鏍倵楠炲灝鍔氶柟铏姍楠炴鎮╃紒妯煎幈闂佹寧妫佸畷鐢稿储濠婂懐纾奸弶鍫涘妿缁犵偟鈧娲橀懝楣冨煡婢跺á鐔兼嚃閳轰緡妲辨繝鐢靛仦閸ㄥ爼骞愰幘顔肩；闁圭偓鏋煎Σ鍫ユ煙閸喖鏆曠紒銊ャ偢閺岋紕浠﹂弬銈堝惈闂?DailyReview
    if (!todayReview) {
      todayReview = createDailyReviewFromTemplates(dateStr);
    } else {
      todayReview = normalizeDailyReviewForScene(todayReview);
    }

    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖淇婇姘辨癁闁稿鎹囬幃浠嬪垂椤愩垺鐣紓鍌欓檷閸斿秹鎮￠敓鐘茬畾闁告劦鍠栫粈瀣亜閹哄秶绛忕紒杈ㄥ哺閺岋綁鎮╅崣澶婃灎缂備胶濮甸悧鐘充繆?
    const checkItems = todayReview.checkItems || [];
    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);

    if (checkItemIndex === -1) {
      console.warn('闂傚倷绀侀幖顐︽偋濠婂嫮顩叉繝闈涙川閻濊埖鎱ㄥ璇蹭壕閻庤娲樺畝绋款嚕鐠鸿　鏋庨柟顖嗗嫷鍟呴梻浣告贡閸樠囨偤閵娿儺娼栭悹鍥ㄧゴ閺嬫棃鏌熸潏鍓х暠缂侇偄绉归弻鏇熷緞濡厧甯ラ梺鎼炲€х粻鎴︹€?', checkItemId);
      addToast('error', 'The selected activity could not be found.');
      return;
    }

    // 闂傚倷绀侀幉锛勬暜閹烘嚚娲晝閳ь剟鎮鹃悜鑺ュ殤妞ゆ垼妫勬禍楣冩煟閻斿搫顣兼繝鈧导瀛樼厱闁靛绠戦崫娲煙椤旇娅婇柟铏矌閸犲﹤螣鏉炴澘顥?
    const updatedCheckItems = [...checkItems];
    const matchedItem = updatedCheckItems[checkItemIndex];
    if (matchedItem.type === 'auto') {
      addToast('error', 'The selected activity could not be found.');
      return;
    }

    const effectiveActionMode = actionMode || 'toggle';
    let nextItem: CheckItem;
    if (matchedItem.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(matchedItem);
      const nextCurrent = effectiveActionMode === 'reset'
        ? 0
        : (effectiveActionMode === 'increment'
          ? Math.min(target, current + 1)
          : (isCompleted ? Math.max(0, current - 1) : Math.min(target, current + 1)));
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'count',
        targetCount: target,
        currentCount: nextCurrent,
        isCompleted: nextCurrent >= target
      };
    } else {
      const isCompleted = effectiveActionMode === 'reset'
        ? false
        : (effectiveActionMode === 'increment' ? true : !matchedItem.isCompleted);
      nextItem = {
        ...matchedItem,
        id: checkItemId,
        manualMode: 'binary',
        targetCount: 1,
        currentCount: isCompleted ? 1 : 0,
        isCompleted
      };
    }

    updatedCheckItems[checkItemIndex] = {
      ...nextItem
    };

    // 闂傚倷绀侀幖顐⒚洪妶澶嬪仱闁靛ň鏅涢拑?DailyReview
    const updatedReview: DailyReview = {
      ...todayReview,
      checkItems: updatedCheckItems,
      updatedAt: Date.now()
    };

    // 闂傚倷绀侀幖顐⒚洪妶澶嬪仱闁靛ň鏅涢拑?dailyReviews 闂傚倷娴囧銊╂倿閿旂晫鐝堕柛鈩冪懃閸?
    const existingReviewIndex = dailyReviews.findIndex(r => r.date === dateStr);
    if (existingReviewIndex >= 0) {
      // 闂傚倷绀侀幖顐⒚洪妶澶嬪仱闁靛ň鏅涢拑鐔封攽閻樺弶澶勯柛瀣箞閺岋絽螖閳ь剟鎮ф繝鍕笉闁圭儤顨嗛悡?review
      setDailyReviews(dailyReviews.map(r => r.date === dateStr ? updatedReview : r));
    } else {
      // 濠电姷鏁搁崕鎴犵礊閳ь剚銇勯弴鍡楀閸欏繘鏌ｉ幇顒佹儓婵☆偅锕㈤弻鐔封枔閸喗鐏嶉梺?review
      setDailyReviews([...dailyReviews, updatedReview]);
    }
  };

  // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎缂侇偄绉归弻鏇熷緞濡厧甯ラ梺鎼炲€х粻鎾诲蓟閿濆惟闁靛鍎烘禒濂告⒑娴兼瑧绉甸柛鎾跺枛閻涱喚鈧綆鍠栫粻娑欍亜閺傝￥浠氶柨鏇炲€归悡?
  const getCheckItemProgress = (checkItemId: string): {
    isCompleted: boolean;
    manualMode: 'binary' | 'count';
    currentCount: number;
    targetCount: number;
  } => {
    const today = new Date();
    const dateStr = getLocalDateStr(today);
    const todayReview = dailyReviews.find(r => r.date === dateStr);
    const templateMeta = getCheckTemplateMeta(checkItemId);
    const defaultManualMode = templateMeta?.manualMode || 'binary';
    const defaultTarget = templateMeta?.targetCount || 1;
    
    if (!todayReview || !todayReview.checkItems) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const checkItemIndex = findCheckItemIndexInReview(todayReview, checkItemId);
    if (checkItemIndex === -1) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }

    const item = todayReview.checkItems[checkItemIndex];
    if (!item) {
      return {
        isCompleted: false,
        manualMode: defaultManualMode,
        currentCount: 0,
        targetCount: defaultTarget
      };
    }
    if (item.type !== 'auto' && item.manualMode === 'count') {
      const { current, target, isCompleted } = getCountState(item);
      return {
        isCompleted,
        manualMode: 'count',
        currentCount: current,
        targetCount: target
      };
    }
    return {
      isCompleted: item.isCompleted || false,
      manualMode: 'binary',
      currentCount: item.isCompleted ? 1 : 0,
      targetCount: 1
    };
  };

  // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎缂侇偄绉归弻鏇熷緞濡厧甯ラ梺鎼炲€х粻鎾诲蓟閿濆惟闁靛鍎烘禒濂告⒑閸濄儱浠滄い鏇ㄥ弮閸┾偓妞ゆ巻鍋撴繝鈧崡鐐╂瀺闁靛繈鍨洪～鏇熺箾閸℃ɑ灏伴柛瀣ㄥ姂閺屾洘绻涢崹顔瑰亾濡ゅ懏鍤屽Δ锝呭暞閸嬶絽銆掑顒婂姛缁炬儳娼￠弻锝夋晲閸滀胶鍚嬮悗瑙勬礈椤牓锝炲┑瀣垫晣闁绘劕鐏氬暩婵犵數濮伴崹褰掓倶閸儱鐤炬繝濠傜墕濮规煡鏌ｉ弬鍨倯闁?
  const getCheckItemContent = (checkItemId: string): string | undefined => {
    // 闂備浇顕уù鐑藉箠閹惧嚢鍥敍閻愯尙鐓戦棅顐㈡处閹风懓鈽夐姀鐘靛姦濡炪倖甯掔€氼剟鎷戦悢鍏肩厪濠㈣埖锚閻忥絿绱掗幇顓ф畼闁汇儺浜、妯款槻闁哄鐟х槐?checkTemplates 闂備浇顕х€涒晝绮欓幒妤佹櫔婵犵數濮崑?
    if (!checkTemplates || checkTemplates.length === 0) {
      return undefined;
    }
    
    // 婵犵數鍋涢顓熸叏鐎电硶鍋撳☉鎺撴珗闁哥噥鍨跺娲传閸曞灚笑闂侀潧娲﹂敃銏ゅ箠濞嗘挸绠ｉ柨鏇楀亾闁藉啰鍠栭弻鏇熷緞濞戞氨鏆犲銈冨劜缁诲牓寮婚敓鐘茬闁挎洍鍋撻柛鏂诲劜閵囧嫰寮撮埄鍐涧闂?
    for (const template of checkTemplates) {
      const item = template.items.find(i => i.id === checkItemId);
      if (item) {
        return item.content;
      }
    }
    return undefined;
  };

  // 婵犵數濮伴崹鐓庘枖濞戞埃鍋撳鐓庢珝妤犵偛鍟换婵嬪礋閵娿儰澹曟繛杈剧到閸燁偊藟瀹ュ鐓?
  const handleNavigation = (targetView: string) => {
    // Set Scene as the previous view before navigating away
    setPreviousView(AppView.SCENE);
    
    switch (targetView) {
      case 'daily-review-today':
        handleNavigateToDailyReview(0); // 婵犵數鍋涢顓熸叏閹绢喗鏅濋柕鍫濐槸妗?
        break;
      case 'daily-review-yesterday':
        handleNavigateToDailyReview(-1); // 闂傚倷绀侀幖顐も偓姘ュ姂瀹曟繂鐣濋崟顐?
        break;
      case 'weekly-review':
        handleNavigateToWeeklyReview();
        break;
      case 'monthly-review':
        handleNavigateToMonthlyReview();
        break;
      case 'stats-today':
        setStatsRange('day');
        setCurrentView(AppView.STATS);
        break;
      case 'stats-week':
        setStatsRange('week');
        setCurrentView(AppView.STATS);
        break;
      default:
        console.warn('闂傚倷绀侀幖顐︽偋濠婂嫮顩查柣鎰劋閸嬪倿鏌ㄩ悢鍝勑ｉ柛搴＄Ч閺屾盯寮撮妸銉よ埅闂佹悶鍊戦崐婵嬪蓟閵堝绀堥棅顐幘閺佹牕鈹戦悙璺虹处闁告鍟块?', targetView);
    }
  };

  // 闂備浇顕х花鑲╁緤缂佹鐝堕柛顐犲劚閺勩儵鏌涘☉娆愮稇缂佲偓閸℃稒鐓熸俊銈傚亾闁绘绻愬嵄闁靛ň鏅滈悡娑㈡煕閹板墎鐣遍柛鏃€纰嶇换娑㈠矗婢跺苯顫ч梺?
  const handleNavigateToDailyReview = (dayOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const dateStr = getLocalDateStr(targetDate);

    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖鎱ㄥ璇蹭壕閻庢鍠曢崡鎶姐€佸☉姗嗘僵妞ゆ挾鍋涙晶楣冩煟鎼达絾鍤€闁圭寽銈冧汗闁告劦鍠楅崑銈夋煏婵炵偓娅呴柟鐟扮埣閺屾洘绻濇惔锝呭弗闂佹悶鍊曢ˇ鐢稿蓟閿熺姴绀冮柨鏇楀亾闁告梹绮嶇换婵嬪焵椤掑嫭鏅搁柣妯哄暱閸擃參姊洪崨濠冨闁稿鎳愮划鍫ュ焵椤掍椒绻?
    let review = dailyReviews.find(r => r.date === dateStr);
    let shouldPersistReview = false;

    // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍏橀弸鏍倵楠炲灝鍔氶柟铏姍楠炴鎮╃紒妯煎幈闂佹寧妫佸畷鐢稿储濠婂懐纾奸弶鍫涘妿缁犵偟鈧娲橀懝楣冨煡婢跺á鐔兼嚃閳轰緡妲遍梻鍌欑閹碱偊宕愮憴鍕彾闁糕剝銇涢弸鏃堟煙鏉堝墽鐣遍柣鎰躬閺岋綁骞囬婵婂焻闂?
    if (!review) {
      review = createDailyReviewFromTemplates(dateStr);
      shouldPersistReview = true;
    } else {
      const normalizedReview = normalizeDailyReviewForScene(review);
      if (normalizedReview !== review) {
        review = normalizedReview;
        shouldPersistReview = true;
      }
    }

    if (shouldPersistReview && review) {
      const exists = dailyReviews.some(r => r.date === dateStr);
      if (exists) {
        setDailyReviews(dailyReviews.map(r => r.date === dateStr ? review : r));
      } else {
        setDailyReviews([...dailyReviews, review]);
      }
    }

    // 闂傚倷鑳堕幊鎾绘倶濮樿泛绠伴柛婵勫劜椤洟鏌熺€涙娓ら柟鐑樻礈閻も偓闂佸搫鍟犻崑鎾绘煥濞戞﹩妯€闁哄本鐩俊鐤槻濞寸娀浜堕弻?- 婵犵數鍋熼ˉ鎰板磻閹邦厾绠鹃柍褜鍓熼弻?Date 闂備浇顕уù鐑藉极閹间降鈧焦绻濋崶銊ョ樁闂佸憡娲﹂崹閬嶅吹閳ь剟鏌ｈ箛鏇炰哗闁稿鍔欓幃宄扳攽鐎ｎ偆鍘搁梺鍛婃礋濞佳囨倶閻樼粯鐓熼柍顖涚懃閹虫劗绮婚弮鍫熺叆闁哄啫娲ら崝鍨亜?
    setCurrentReviewDate(targetDate);
    setIsDailyReviewOpen(true);
  };

  // 闂備浇顕х花鑲╁緤缂佹鐝堕柛顐犲劚閺勩儵鏌涘☉娆愮稇缂佲偓閸℃稒鐓熸俊銈傚亾闁绘绻愬嵄闁靛ň鏅滈悡鏇熺箾閹寸偟澧┑鈥冲悑缁绘盯宕ｆ径灞筋潷闂?
  const handleNavigateToWeeklyReview = () => {
    // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎閻庢艾顦伴妵鍕箳閸℃ぞ澹曢梻浣烘嚀閸熷灝螞濠靛绠氶柛鎰靛枛缁€瀣亜閹扳晛鈧鏁嶅☉娆戠瘈婵炲牆鐏濋弸娑欍亜閹存繃鍤囨鐐茬箻楠炲秹顢欓崜褝绱查梻浣筋潐閸庢娊鎮洪妸褌鐒婇柛鈩冪⊕閻撴盯鏌涢幇鍓佺暠闁告梹绮嶇换婵嬪焵?
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 闂傚倷绀侀幉锛勭矙韫囨稑绀夐悗锝庡墰閸楁岸鎮楀☉娆樼劷闁崇粯妫冨鍫曟倷閺夋埈妫嗗銈呯箻娴滃爼寮诲☉妯锋闁哄诞鍐剧€锋繝鐢靛仜閻楀﹪宕归悽鍓叉晪闁挎繂顦悞鍨亜閹哄秶鍔嶉柛?
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖鎱ㄥ璇蹭壕閻庢鍠曢崡鎶姐€佸☉姗嗘僵妞ゆ挾鍋涙晶楣冩煟鎼达絾鍤€闁圭寽銈冧汗闁告劦鍠楅崑銈夋煏婵炵偓娅呴柟鐟扮埣閺屾洘绻濊箛娑欘€嶉梺鍦厴娴滃爼寮诲☉妯锋闁哄诞鍐剧€锋繝鐢靛仜閻楀﹪宕归崹顔炬殾闁割偅娲橀崐鐑芥煙椤撶喎鍧婇柛?
    let review = weeklyReviews.find(r => r.weekStartDate === weekStartStr);

    // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍏橀弸鏍倵楠炲灝鍔氶柟铏姍楠炴鎮╃紒妯煎幈闂佹寧妫佸畷鐢稿储濠婂懐纾奸弶鍫涘妿缁犵偟鈧娲橀懝楣冨煡婢跺á鐔兼嚃閳轰緡妲遍梻鍌欑閹碱偊宕愮憴鍕彾闁糕剝銇涢弸鏃堟煙鏉堝墽鐣遍柣鎰躬閺岋綁骞囬婵婂焻闂?
    if (!review) {
      review = {
        id: `weekly-${Date.now()}`,
        weekStartDate: weekStartStr,
        weekEndDate: weekEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setWeeklyReviews([...weeklyReviews, review]);
    }

    // 闂傚倷鑳堕幊鎾绘倶濮樿泛绠伴柛婵勫劜椤洟鏌熺€涙娓ら柟鐑樻礈閻も偓闂佸湱鍋撳娆忊枍濞嗘挻鈷戦柟鑲╁仜閸斻倝鏌涚€ｃ劌鈧繃淇?- 婵犵數鍋熼ˉ鎰板磻閹邦厾绠鹃柍褜鍓熼弻?Date 闂備浇顕уù鐑藉极閹间降鈧焦绻濋崶銊ョ樁?
    setCurrentWeeklyReviewStart(weekStart);
    setCurrentWeeklyReviewEnd(weekEnd);
    setIsWeeklyReviewOpen(true);
  };

  // 闂備浇顕х花鑲╁緤缂佹鐝堕柛顐犲劚閺勩儵鏌涘☉娆愮稇缂佲偓閸℃稒鐓熸俊銈傚亾闁绘绻愬嵄闁靛ň鏅滈悡娑㈡煕椤愶絿绠樺褎娲樼换娑㈠矗婢跺苯顫ч梺?
  const handleNavigateToMonthlyReview = () => {
    // 闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎閻庢艾顦伴妵鍕箳瀹ュ洤濡界紓浣哄У閸ㄥ潡寮婚敐澶娢╅柕澶堝労娴犺偐绱撴担浠嬪摵闁搞劌鐖奸獮鍫ュΩ瑜夐崑鎾绘晲鎼存繄鍑归柣搴亢鐏忔瑧妲愰幘瀛樺閻熸瑥瀚棄宥呪攽閻愮鎷￠柛瀣工椤曪綁顢氶埀顒佷繆閻戣姤鏅滈柦妯侯槺閸?
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // 闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柛娆忣槺閻濊埖鎱ㄥ璇蹭壕閻庢鍠曢崡鎶姐€佸☉姗嗘僵妞ゆ挾鍋涙晶楣冩煟鎼达絾鍤€闁圭寽銈冧汗闁告劦鍠楅崑銈夋煏婵炵偓娅呴柟鐟扮埣閺屾洘绻濊箛娑欘€嶉梺鍦厴娴滃爼寮婚敓鐘查唶婵犻潧鐗嗛埅鍗炩攽閻愯尙澧涢柛銊ョ仢閻ｇ兘宕奸弴鐔封偓鐑芥煙椤撶喎鍧婇柛?
    let review = monthlyReviews.find(r => r.monthStartDate === monthStartStr);

    // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞閻庯綆鍏橀弸鏍倵楠炲灝鍔氶柟铏姍楠炴鎮╃紒妯煎幈闂佹寧妫佸畷鐢稿储濠婂懐纾奸弶鍫涘妿缁犵偟鈧娲橀懝楣冨煡婢跺á鐔兼嚃閳轰緡妲遍梻鍌欑閹碱偊宕愮憴鍕彾闁糕剝銇涢弸鏃堟煙鏉堝墽鐣遍柣鎰躬閺岋綁骞囬婵婂焻闂?
    if (!review) {
      review = {
        id: `monthly-${Date.now()}`,
        monthStartDate: monthStartStr,
        monthEndDate: monthEndStr,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers: []
      };

      setMonthlyReviews([...monthlyReviews, review]);
    }

    // 闂傚倷鑳堕幊鎾绘倶濮樿泛绠伴柛婵勫劜椤洟鏌熺€涙娓ら柟鐑樻礈閻も偓闂佸搫鍟犻崑鎾剁磼閻樺啿鐏撮柡灞剧洴婵＄柉顦插ù鐘讳憾閺?- 婵犵數鍋熼ˉ鎰板磻閹邦厾绠鹃柍褜鍓熼弻?Date 闂備浇顕уù鐑藉极閹间降鈧焦绻濋崶銊ョ樁?
    setCurrentMonthlyReviewStart(monthStart);
    setCurrentMonthlyReviewEnd(monthEnd);
    setIsMonthlyReviewOpen(true);
  };

  return (
    <div 
      className="flex h-full min-h-0 relative"
      style={{
        backgroundColor: hasBackground ? 'transparent' : '#faf9f6'
      }}
    >
      {/* 闂傚倷鑳堕崢褔宕崸妤€瀚夋い鎺嗗亾闁宠绉撮埢搴ㄥ箻瀹曞洤鈧偤姊洪崨濠冨瘷闁告劗鍋撳В鍫ユ⒑?*/}
      {hasBackground && (
        <div 
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform: 'translateZ(0)'
          }}
        />
      )}
      
      {/* 闂傚倷鑳堕…鍫㈡崲閸儱绀夌€光偓閸曨剙鍓冲銈嗗笒鐎氼剛娑甸埀顒佺節閻㈤潧孝婵炶尙濞€瀹曟垿骞橀崷顓犳澑闂佸搫鍟犻崑鎾淬亜椤愶絿澧垫慨濠冩そ椤㈡寰勬繝鍐壕闂備胶顭堢粔鍫曞极閸涘﹦顩?*/}
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'rgba(250, 249, 246, 0.5)' }}></div>

      {/* 闂佽楠哥紞濠傤焽閼姐倗纾芥慨妯挎硾閻ら箖鏌ょ粙璺ㄤ粵缂傚秴娲幃宄扳枎韫囨搩浼€闂?- 闂傚倷绀侀幖顐﹀疮椤愶附鍋夐柣鎾冲濞戙垹鍨傛い鏃囶潐閻忎線姊婚崒姘卞缂佸鍨块幃妯衡枎閹炬潙浠?*/}
      <div className="flex-shrink-0 flex h-full min-h-0 flex-col overflow-y-auto pt-6 pb-20 pl-0 pr-2 no-scrollbar z-0 transition-all duration-300 relative w-16 items-center">
        <div className="flex-1 w-full">
          {timeSlots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  setSelectedSlotIndex(index);
                }}
                className={`
                  flex items-center justify-center gap-2 mb-1 transition-all duration-200 text-left relative rounded-r-2xl group
                  w-12 h-12 md:w-14 md:h-14
                  ${isSelected
                    ? 'text-stone-900 font-bold bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.02)] z-10'
                    : 'text-stone-600 hover:text-stone-800'
                  }
                `}
                title={slot.name}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: 'var(--accent-color)' }}></div>
                )}
                {/* 婵犵數鍋犻幓顏嗙礊閳ь剚绻涙径瀣鐎?IconRenderer 缂傚倸鍊搁崐鐑芥嚄閸洖绐楃€广儱娲ㄩ崡姘舵倵濞戞顏嗘閻愮儤鐓曢柡鍥ュ妼楠炴鏌涙繝鍕槐闁哄本鐩俊鐤槻濞存粓绠栭弻锝夊冀閻㈤潧鍩岄梺闈涙鐢€崇暦閿濆棗绶為悘鐐舵閼?*/}
                <div className="flex-shrink-0">
                  <IconRenderer 
                    icon={slot.icon || 'clock'}
                    uiIcon={slot.uiIcon}
                    size={20}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 闂傚倷绀侀幉锟犳偡閵夆晛鍌ㄩ柡宥庡幖閻ら箖鏌ら崫銉︽毄闁崇粯妫冮幃瑙勬媴閸濄儻绱炵紓浣割槸閵堟悂寮诲☉銏犵疀妞ゆ帊绀佸▍锝咁渻?*/}
      <div 
        className="flex-1 min-h-0 overflow-hidden flex flex-col p-5 md:p-10 rounded-tl-[2rem] shadow-[-5px_0_20px_rgba(0,0,0,0.08)] z-10 ml-[-10px] relative"
        id="scene-content"
      >
        {/* 闂傚倷绀侀幉锟犮€冮崨瀛樻櫇妞ゅ繐鐗嗛悞鍨亜閹哄棗浜剧紓浣虹帛閸ㄩ潧宓勯梺纭呮彧闂勫嫰宕曞畝鍕厱濠电姴瀚弸搴亜閵夈儳绠绘慨濠冩そ椤㈡寰勬繝鍐壕闂備胶顭堢粔鍫曞极閸涘﹦顩?*/}
        <div 
          className={`absolute inset-0 -z-10 rounded-tl-[2rem] ${useReducedEffects ? '' : 'backdrop-blur-sm'}`}
          style={{
            backgroundColor: `rgba(255, 255, 255, ${panelOverlayOpacity})`
          }}
        />

        {/* 婵犵數濮伴崹濂稿春閺嶎厼绠伴柟鎯版绾惧潡鏌熺紒銏犳灍闁哄拋鍓氶幈銊ヮ潨閸℃顫紓浣割槸閵堟悂寮诲☉銏犵鐎规洖娉﹂敐鍡曠箚闁绘劖褰冮埀顒€鐏濋～蹇涙嚒閵堝倸浜炬繛鎴炵懕娓氭盯鏌涢悙鎵煓闁哄备鈧剚鍚嬮柛娑卞枛閺嬬姴顪冮妶蹇曞缂侇喗鐟╅悰顔锯偓锝庡枛閸愨偓闂侀潧顭€靛苯危椤栫偞鈷?*/}
        <div className="mb-8 md:mb-10 flex items-center mt-2 md:mt-0">
          <h1 className="text-xl md:text-2xl font-mono font-light text-stone-600 tracking-tight">
            {currentSlot.displayTitle || `${currentSlot.startTime} - ${currentSlot.endTime}`}
          </h1>
          <div className="h-px flex-1 bg-stone-100 mx-4"></div>
          {isManualSceneGroupMode ? (
            <div ref={groupMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsGroupMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] md:text-xs text-stone-500 border border-stone-200 rounded-full bg-white/70 transition-colors hover:border-stone-300 hover:text-stone-700"
                aria-haspopup="menu"
                aria-expanded={isGroupMenuOpen}
                title="切换场景组"
              >
                <span>{displayedGroup.name}</span>
                <ChevronDown size={12} className={`transition-transform ${isGroupMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isGroupMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                  <div className="max-h-72 overflow-y-auto py-1">
                    {sceneGroupState.groups.map((group) => {
                      const isSelected = group.id === sceneGroupState.activeGroupId;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => handleManualGroupSelect(group.id)}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected ? 'font-bold' : 'text-stone-700 hover:bg-stone-50'
                          }`}
                          style={isSelected ? {
                            backgroundColor: 'color-mix(in srgb, var(--accent-color) 12%, white)',
                            color: 'var(--accent-color)'
                          } : undefined}
                        >
                          <span className="truncate">{group.name}</span>
                          {isSelected && <Check size={15} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="px-2 py-0.5 text-[11px] md:text-xs text-stone-500 border border-stone-200 rounded-full bg-white/70">
              {displayedGroup.name}
            </span>
          )}
        </div>

        {/* 濠电姷鏁搁崑鐘典焊椤忓牜鏁嬬憸搴ㄥ箞閵娾晛鐓涢柛娑卞幘椤㈠懘姊洪幐搴ｂ槈閻庢凹鍓熼妴鍌涚節濮橆厾鍘遍梺鍦劋閹尖晛鈻撳▎鎾寸厪?- 闂傚倷绀侀幉锟犮€冮崱妞曟椽寮介鐐茬€銈呯箰濡瑩寮冲鍫熺厱闁规壋鏅涙俊鎸庣節閳?*/}
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pb-24 no-scrollbar">
          {currentCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-stone-400">
                <p className="text-sm leading-relaxed">No cards in this scene yet. Open scene settings to add cards and quick actions.</p>
              </div>
            </div>
          ) : (
            currentCards.map((card) => {
              // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞闁归偊鍓欏宄邦渻閵堝棛澧紒瀣浮閺佸秵寰勯幇顓炰化闂佹悶鍎崝宀勫礉閵堝洠鍋撶憴鍕濞存粌鐖奸獮鍐樄鐎规洝鍩栭ˇ鐗堟償閿濆孩啸闂傚倷绀侀崥瀣磿閹惰棄搴婇柤鑹扮堪娴滃綊鏌涢妷顔煎缂佲偓閸岀偞鍋ｅΔ锔藉椤忕娀鏌￠崱妯哄摵闁哄瞼鍠撻埀顒佺⊕閿氬┑顔碱槸閳规垿顢欓懞銉モ偓鎰殽閻愨晛浜惧┑鐐舵彧缁蹭粙骞夐敍鍕ㄥ亾濮橆厾鍙€闁哄本鐩獮鍥敆娴ｅ憡顏犳俊?
              let cardWithStatus = card;
              
              if (card.type === 'checklist' && card.action.checkItemId) {
                const progress = getCheckItemProgress(card.action.checkItemId);
                const checkItemContent = getCheckItemContent(card.action.checkItemId);
                cardWithStatus = { 
                  ...card, 
                  isCompleted: progress.isCompleted,
                  checkItemContent,
                  checkManualMode: progress.manualMode,
                  checkCurrentCount: progress.currentCount,
                  checkTargetCount: progress.targetCount
                };
              }
              
              // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞闁归偊鍓欏宄邦渻閵堝棛澧紒顔奸叄瀹曟椽鎮╃紒妯轰化婵炶揪绲剧粊鎾磻閹捐绀冮柟缁樺笩閳ь剙娼″铏圭磼濮楀棙鐣跺┑鐐存綑鐎氼喖危閹邦兘鏀介柛顐ゅ枎椤庢盯姊洪幐搴ｂ槈閻庢凹鍣ｅ鎶筋敆閸曨剛鍘搁梺鍛婂姂閸斿酣宕洪敐澶嬬厸闁糕剝绋愰幉鍓р偓娈垮櫘閸嬪﹪骞冭瀹曠厧鈹戦崼娑樹喊
              if (card.type === 'stats') {
                const statValue = calculateStatsDuration(card.filterActivityIds);
                const statMinutes = calculateStatsDurationMinutes(card.filterActivityIds);
                cardWithStatus = { 
                  ...cardWithStatus, 
                  statValue,
                  statMinutes // 濠电姷鏁搁崕鎴犵礊閳ь剚銇勯弴鍡楀閸欏繘鏌ｉ幇顒佹儓缂佲偓閸℃稒鐓曢柍鈺佸暟閳洟鎮楀▓鍨籍闁哄备鍓濋幏鍛存偡闁附顥嬮梻浣芥〃闂勫秹宕愰弽顐ょ焿鐎广儱妫欓崕鐔兼煏閸繃宸濇い鏃€甯￠弻鐔兼嚌閻楀牆娑ч梻鍌氬鐎氼剟鈥﹂崶顒夋晬婵犲﹤瀚娑㈡⒑閹稿海鈽夐悗姘煎櫍瀵?
                };
              }
              
              // 婵犵數濮烽。浠嬪焵椤掆偓閸熷潡鍩€椤掆偓缂嶅﹪骞冨Ο璇茬窞闁归偊鍓欏宄邦渻閵堝棛澧慨妯稿妿缁岸宕稿Δ浣哄幗濡炪値鍋掗崜娆愪繆閼测斁鍋撶憴鍕濞存粌鐖奸獮鍐樄鐎规洝鍩栭ˇ鐗堟償閿濆孩啸闂傚倷绀侀幖顐ゆ偖椤愶箑纾块柟缁㈠櫘閺佸淇婇妶鍌氫壕濡炪倖娲╃紞浣割嚕閹绢喗鍋愰柧蹇ｅ亝椤撳綊姊绘担鍛婂暈闁告梹娲熼獮濠冩償椤垶鏅?
              if (card.type === 'reference' && card.action.type === 'reference') {
                const { sourceType, dateOffset, questionId, fallbackText } = card.action;
                
                if (sourceType && dateOffset && questionId) {
                  const referenced = getReferencedContent(sourceType, dateOffset, questionId);
                  
                  if (referenced) {
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: referenced.question,
                      referencedAnswer: referenced.answer
                    };
                  } else {
                    // 闂傚倷绀佺紞濠傤焽瑜戦妵鎰版倷閻㈢數鐣舵繝銏ｅ煐閸旀洜绮堥崱娑欑厸濠㈣泛锕︽禒銏ゆ煛娴ｅ摜鍩ｉ柟顔筋殘濞戠敻宕担鍦Х婵犵绱曢崑娑㈠磹瑜版帒绠柛娑卞灡瀹曞鏌曟繝蹇涙婵?fallback
                    cardWithStatus = {
                      ...cardWithStatus,
                      referencedQuestion: fallbackText || 'No synced content yet.',
                      referencedAnswer: fallbackText || 'No synced content yet.'
                    };
                  }
                }
              }
              
              return (
                <SceneCard
                  key={card.id}
                  data={cardWithStatus}
                  dailyReviews={dailyReviews}
                  logs={logs}
                  onAction={handleCardAction}
                  sceneCardTimerMode={sceneCardTimerMode}
                  externalFlipped={isWidgetSessionMatchForCard(card) || getStoredSceneCardFlipState(card.id)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

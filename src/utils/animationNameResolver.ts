/**
 * Animation Name Resolver Utility
 * حل تعارض أسماء الأنميشن وإدارة التسمية الذكية
 */

export interface AnimationNameConfig {
  originalPrefix: string;
  importedPrefix: string;
  maxNameLength: number;
  conflictSuffix: string;
}

export const DEFAULT_NAME_CONFIG: AnimationNameConfig = {
  originalPrefix: '🎬 ',
  importedPrefix: '🎭 Mixamo: ',
  maxNameLength: 50,
  conflictSuffix: ' (مكرر)'
};

export class AnimationNameResolver {
  private config: AnimationNameConfig;
  private usedNames: Set<string> = new Set();

  constructor(config: AnimationNameConfig = DEFAULT_NAME_CONFIG) {
    this.config = config;
  }

  /**
   * تنظيف اسم الأنميشن من البادئات غير المرغوب فيها
   */
  private cleanAnimationName(name: string): string {
    const unwantedPrefixes = [
      'mixamorig:',
      'mixamo:',
      'Armature|',
      'Scene|',
      'RootNode|'
    ];

    let cleanName = name.trim();
    
    for (const prefix of unwantedPrefixes) {
      if (cleanName.startsWith(prefix)) {
        cleanName = cleanName.substring(prefix.length);
        break;
      }
    }

    // تحسين الأسماء الشائعة
    const nameImprovements: Record<string, string> = {
      'Walking': 'المشي',
      'Running': 'الجري',
      'Idle': 'الوقوف',
      'Jump': 'القفز',
      'Dance': 'الرقص',
      'Wave': 'التلويح',
      'Sitting': 'الجلوس',
      'Standing': 'الوقوف',
      'Clapping': 'التصفيق'
    };

    return nameImprovements[cleanName] || cleanName;
  }

  /**
   * توليد اسم فريد للأنميشن
   */
  public generateUniqueName(
    baseName: string,
    isImported: boolean = false,
    existingNames?: Set<string>
  ): string {
    const names = existingNames || this.usedNames;
    const cleanName = this.cleanAnimationName(baseName);
    const prefix = isImported ? this.config.importedPrefix : this.config.originalPrefix;
    
    let proposedName = `${prefix}${cleanName}`;
    
    // تقصير الاسم إذا كان طويلاً جداً
    if (proposedName.length > this.config.maxNameLength) {
      const maxCleanLength = this.config.maxNameLength - prefix.length - 3;
      proposedName = `${prefix}${cleanName.substring(0, maxCleanLength)}...`;
    }

    // التحقق من التعارض وحله
    if (!names.has(proposedName)) {
      names.add(proposedName);
      return proposedName;
    }

    // حل التعارض بالترقيم الذكي
    let counter = 1;
    let uniqueName: string;

    do {
      if (isImported) {
        uniqueName = `${proposedName} (${counter})`;
      } else {
        uniqueName = `${proposedName} ${counter}`;
      }
      counter++;
    } while (names.has(uniqueName) && counter < 100);

    names.add(uniqueName);
    return uniqueName;
  }

  /**
   * إعادة تعيين قائمة الأسماء المستخدمة
   */
  public resetUsedNames(): void {
    this.usedNames.clear();
  }

  /**
   * إضافة اسم إلى قائمة الأسماء المستخدمة
   */
  public addUsedName(name: string): void {
    this.usedNames.add(name);
  }

  /**
   * التحقق من وجود تعارض في الاسم
   */
  public hasConflict(name: string, existingNames?: Set<string>): boolean {
    const names = existingNames || this.usedNames;
    return names.has(name);
  }

  /**
   * اقتراح أسماء بديلة في حالة التعارض
   */
  public suggestAlternativeNames(baseName: string, count: number = 3): string[] {
    const suggestions: string[] = [];
    const cleanName = this.cleanAnimationName(baseName);
    
    const variations = [
      `${cleanName} محسن`,
      `${cleanName} جديد`,
      `${cleanName} مخصص`,
      `نسخة من ${cleanName}`,
      `${cleanName} متقدم`
    ];

    for (let i = 0; i < Math.min(count, variations.length); i++) {
      if (!this.usedNames.has(variations[i])) {
        suggestions.push(variations[i]);
      }
    }

    return suggestions;
  }
}

// إنشاء مثيل افتراضي للاستخدام العام
export const defaultNameResolver = new AnimationNameResolver();
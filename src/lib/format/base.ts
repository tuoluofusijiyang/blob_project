export interface ArticleContent {
  title: string;
  markdown: string;
  images: Array<{
    id: number;
    url: string;
    alt: string;
    caption?: string;
    width: number;
    height: number;
  }>;
  metadata: {
    author?: string;
    summary?: string;
    tags?: string[];
  };
}

export interface FormattedOutput {
  format: 'markdown' | 'html' | 'plain';
  content: string;
  warnings: string[];
}

export interface PlatformAdapter {
  slug: string;
  name: string;
  format(content: ArticleContent, options?: any): Promise<FormattedOutput>;
  validate(content: ArticleContent): string[];
}
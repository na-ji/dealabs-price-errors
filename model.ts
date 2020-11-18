export interface Comment {
  commentId: string;
  threadId: string;
  url: string;
  preparedHtmlContent: string;
  likes: number;
}

export interface GraphQLResponse {
  data: {
    comments: {
      items: Comment[];
      pagination: {
        count: number;
        current: number;
        last: number;
        next: number | null;
        previous: number;
      };
    };
  };
  status: 'success';
}

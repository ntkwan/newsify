import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'TrendingArticles',
    timestamps: false,
    schema: 'public',
    modelName: 'Article',
})
export class Article extends Model {
    @Column({
        type: DataType.UUID,
        primaryKey: true,
        field: 'trending_id',
    })
    trendingId: string;

    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'article_id',
    })
    articleId: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    url: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'image_url',
    })
    imageUrl: string;

    @Column({
        type: DataType.ARRAY(DataType.TEXT),
        allowNull: false,
    })
    categories: string[];

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'main_category',
    })
    mainCategory: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    trend: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    content: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    summary: string;

    @Column({
        type: DataType.FLOAT,
        allowNull: false,
        field: 'similarity_score',
    })
    similarityScore: number;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'publish_date',
    })
    publishDate: Date;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'analyzed_date',
    })
    analyzedDate: Date;
}

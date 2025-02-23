import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root1',
      database: 'reviewsdb'
    })

    // Get sentiment and key phrases data
    const [rows] = await connection.execute('SELECT sentiment_value, key_phrases FROM processed_reviews')
    
    let positive = 0, negative = 0, neutral = 0
    const keywords = new Map()
    const keywordSentiments = new Map()

    rows.forEach(row => {
      // Count sentiments
      if (row.sentiment_value === 'positive') positive++
      else if (row.sentiment_value === 'negative') negative++
      else if (row.sentiment_value === 'neutral') neutral++

      // Process keywords with sentiments
      if (row.key_phrases) {
        row.key_phrases.split(',').forEach(keyword => {
          const trimmed = keyword.trim()
          keywords.set(trimmed, (keywords.get(trimmed) || 0) + 1)
          
          if (!keywordSentiments.has(trimmed)) {
            keywordSentiments.set(trimmed, {
              positive: 0,
              negative: 0,
              neutral: 0
            })
          }
          keywordSentiments.get(trimmed)[row.sentiment_value.toLowerCase()]++
        })
      }
    })

    // Calculate percentages
    const total = positive + negative + neutral
    const pieData = [
      { name: 'Positive', value: positive, percentage: ((positive/total) * 100).toFixed(1) },
      { name: 'Negative', value: negative, percentage: ((negative/total) * 100).toFixed(1) },
      { name: 'Neutral', value: neutral, percentage: ((neutral/total) * 100).toFixed(1) }
    ]

    // Get top 5 keywords with sentiment distribution
    const topKeywordsWithSentiments = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => {
        const sentiments = keywordSentiments.get(name)
        return {
          name,
          value,
          sentiments: {
            positive: sentiments.positive,
            negative: sentiments.negative,
            neutral: sentiments.neutral
          }
        }
      })

    await connection.end()

    const response = {
      pieData,
      keywordSentiments: topKeywordsWithSentiments
    }

    console.log('API Response Data:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
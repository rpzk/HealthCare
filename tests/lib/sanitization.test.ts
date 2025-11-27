import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml,
  sanitizeSqlLike,
  sanitizeText,
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeCpf,
  sanitizeSearchQuery,
  containsInjectionAttempt,
} from '@/lib/sanitization'

describe('Sanitization Utilities', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
    })

    it('should handle ampersands', () => {
      expect(sanitizeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as any)).toBe('')
      expect(sanitizeHtml(undefined as any)).toBe('')
    })
  })

  describe('sanitizeSqlLike', () => {
    it('should escape LIKE wildcards', () => {
      expect(sanitizeSqlLike('100%')).toBe('100\\%')
      expect(sanitizeSqlLike('user_name')).toBe('user\\_name')
    })

    it('should escape backslashes', () => {
      expect(sanitizeSqlLike('path\\to\\file')).toBe('path\\\\to\\\\file')
    })
  })

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      // Control character \x00 is simply removed, no space inserted
      expect(sanitizeText('hello\x00world')).toBe('helloworld')
    })

    it('should normalize whitespace', () => {
      expect(sanitizeText('hello    world')).toBe('hello world')
    })

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello world  ')).toBe('hello world')
    })

    it('should convert newlines and tabs to spaces', () => {
      const input = 'line1\nline2\ttab'
      expect(sanitizeText(input)).toBe('line1 line2 tab')
    })
  })

  describe('sanitizeName', () => {
    it('should keep valid names', () => {
      expect(sanitizeName('João da Silva')).toBe('João da Silva')
      expect(sanitizeName("O'Brien")).toBe("O'Brien")
      expect(sanitizeName('María-José')).toBe('María-José')
    })

    it('should remove angle brackets but keep alphanumeric', () => {
      // < and > are removed, but 'script' is valid alphanumeric
      expect(sanitizeName('Test<script>')).toBe('Testscript')
      // semicolon is removed
      expect(sanitizeName('Name; DROP TABLE')).toBe('Name DROP TABLE')
    })

    it('should limit length to 200', () => {
      const longName = 'A'.repeat(300)
      expect(sanitizeName(longName).length).toBe(200)
    })
  })

  describe('sanitizeEmail', () => {
    it('should lowercase and trim', () => {
      expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com')
    })

    it('should remove angle brackets but keep alphanumeric', () => {
      // < and > are not valid email chars, removed
      // but 'script' is valid alphanumeric
      expect(sanitizeEmail('test<script>@mail.com')).toBe('testscript@mail.com')
    })

    it('should keep valid email characters', () => {
      expect(sanitizeEmail('user.name+tag@example.com')).toBe('user.name+tag@example.com')
    })
  })

  describe('sanitizePhone', () => {
    it('should keep only digits', () => {
      expect(sanitizePhone('(11) 99999-9999')).toBe('11999999999')
      expect(sanitizePhone('+55 11 99999-9999')).toBe('5511999999999')
    })

    it('should limit to 20 digits', () => {
      expect(sanitizePhone('1'.repeat(30)).length).toBe(20)
    })
  })

  describe('sanitizeCpf', () => {
    it('should keep only digits', () => {
      expect(sanitizeCpf('123.456.789-00')).toBe('12345678900')
    })

    it('should limit to 11 digits', () => {
      expect(sanitizeCpf('1'.repeat(20)).length).toBe(11)
    })
  })

  describe('sanitizeSearchQuery', () => {
    it('should remove special search characters', () => {
      // < and > are removed, but alphanumeric stays
      expect(sanitizeSearchQuery('test<script>')).toBe('testscript')
      expect(sanitizeSearchQuery('user|admin')).toBe('useradmin')
    })

    it('should keep valid search terms', () => {
      expect(sanitizeSearchQuery('diabetes mellitus tipo 2')).toBe('diabetes mellitus tipo 2')
    })

    it('should limit to 100 characters', () => {
      expect(sanitizeSearchQuery('A'.repeat(200)).length).toBe(100)
    })
  })

  describe('containsInjectionAttempt', () => {
    it('should detect script tags', () => {
      expect(containsInjectionAttempt('<script>alert(1)</script>')).toBe(true)
      expect(containsInjectionAttempt('<SCRIPT>alert(1)</SCRIPT>')).toBe(true)
    })

    it('should detect javascript: protocol', () => {
      expect(containsInjectionAttempt('javascript:alert(1)')).toBe(true)
    })

    it('should detect event handlers', () => {
      expect(containsInjectionAttempt('onclick=alert(1)')).toBe(true)
      expect(containsInjectionAttempt('onerror = alert(1)')).toBe(true)
    })

    it('should detect SQL injection patterns', () => {
      expect(containsInjectionAttempt("'; DROP TABLE users--")).toBe(true)
      expect(containsInjectionAttempt('UNION SELECT * FROM')).toBe(true)
    })

    it('should not flag normal text', () => {
      expect(containsInjectionAttempt('João da Silva')).toBe(false)
      expect(containsInjectionAttempt('diabetes tipo 2')).toBe(false)
      expect(containsInjectionAttempt('test@email.com')).toBe(false)
    })

    it('should handle empty/null input', () => {
      expect(containsInjectionAttempt('')).toBe(false)
      expect(containsInjectionAttempt(null as any)).toBe(false)
    })
  })
})

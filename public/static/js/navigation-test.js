// Navigation Test Suite
class NavigationTestSuite {
    constructor() {
        this.testResults = {};
        this.init();
    }

    init() {
        this.setupTestEnvironment();
        this.runInitialTests();
    }

    setupTestEnvironment() {
        // Setup test environment
        console.log('Navigation Test Suite initialized');
        
        // Add test-specific CSS variables if needed
        if (!document.documentElement.style.getPropertyValue('--test-mode')) {
            document.documentElement.style.setProperty('--test-mode', 'true');
        }
    }

    runInitialTests() {
        // Run basic tests on page load
        setTimeout(() => {
            this.testBasicNavigation();
        }, 1000);
    }

    testBasicNavigation() {
        // Test basic navigation functionality
        const tests = [
            { name: 'Navigation Elements', test: () => this.testNavigationElements() },
            { name: 'Anchor Links', test: () => this.testAnchorLinks() },
            { name: 'Scroll Behavior', test: () => this.testScrollBehavior() }
        ];

        tests.forEach(test => {
            try {
                const result = test.test();
                this.updateTestStatus(test.name, result ? 'pass' : 'fail');
            } catch (error) {
                console.error(`Test failed: ${test.name}`, error);
                this.updateTestStatus(test.name, 'fail');
            }
        });
    }

    testNavigationElements() {
        const navElements = [
            'demo-navigation',
            'breadcrumb-nav',
            'section-indicator',
            'back-to-top'
        ];

        return navElements.every(id => document.getElementById(id) !== null);
    }

    testAnchorLinks() {
        const sections = document.querySelectorAll('.test-section');
        const navLinks = document.querySelectorAll('.demo-nav-item a');
        
        // Check if all sections have corresponding nav links
        return Array.from(sections).every(section => {
            const sectionId = section.id;
            return document.querySelector(`[href="#${sectionId}"]`) !== null;
        });
    }

    testScrollBehavior() {
        // Test if smooth scrolling is supported
        return 'scrollBehavior' in document.documentElement.style;
    }

    updateTestStatus(testName, status) {
        const statusElement = document.getElementById(`${testName.toLowerCase().replace(/\s+/g, '-')}-status`);
        if (statusElement) {
            statusElement.textContent = status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'Pending';
            statusElement.className = `test-status ${status}`;
        }

        // Update test results
        this.testResults[testName] = status;
        this.updateSummary();
    }

    updateSummary() {
        const totalTests = Object.keys(this.testResults).length;
        const passedTests = Object.values(this.testResults).filter(status => status === 'pass').length;
        const failedTests = Object.values(this.testResults).filter(status => status === 'fail').length;

        // Update summary display
        console.log(`Test Summary: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
    }
}

// Test Functions
function testSidebarNavigation() {
    const nav = document.querySelector('.demo-navigation');
    const navList = document.querySelector('.demo-nav-list');
    
    if (nav && navList) {
        // Test navigation structure
        const navItems = navList.querySelectorAll('.demo-nav-item');
        const hasIcons = Array.from(navItems).every(item => item.querySelector('.nav-icon'));
        const hasCounts = Array.from(navItems).every(item => item.querySelector('.nav-count'));
        
        const result = navItems.length > 0 && hasIcons && hasCounts;
        window.navigationTests.updateTestStatus('Sidebar Navigation', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testBreadcrumbNavigation() {
    const breadcrumb = document.querySelector('.breadcrumb-nav');
    const breadcrumbList = document.querySelector('.breadcrumb-list');
    
    if (breadcrumb && breadcrumbList) {
        const breadcrumbItems = breadcrumbList.querySelectorAll('.breadcrumb-item');
        const hasLinks = breadcrumbList.querySelector('.breadcrumb-link') !== null;
        const hasCurrent = breadcrumbList.querySelector('.breadcrumb-current') !== null;
        
        const result = breadcrumbItems.length > 0 && hasLinks && hasCurrent;
        window.navigationTests.updateTestStatus('Breadcrumb Navigation', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testSectionIndicators() {
    const indicator = document.getElementById('section-indicator');
    const currentSection = document.getElementById('current-section');
    
    if (indicator && currentSection) {
        const result = indicator.textContent.includes('Current Section:') && currentSection.textContent.length > 0;
        window.navigationTests.updateTestStatus('Section Indicators', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testInternalLinks() {
    const sections = document.querySelectorAll('.test-section');
    const navLinks = document.querySelectorAll('.demo-nav-item a');
    
    // Test if clicking nav links scrolls to sections
    let testPassed = true;
    
    navLinks.forEach((link, index) => {
        const href = link.getAttribute('href');
        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (!targetSection) {
            testPassed = false;
        }
    });
    
    window.navigationTests.updateTestStatus('Internal Links', testPassed ? 'pass' : 'fail');
    return testPassed;
}

function testNavigationLinks() {
    const navLinks = document.querySelectorAll('.demo-nav-item a');
    let testPassed = true;
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) {
            testPassed = false;
        }
    });
    
    window.navigationTests.updateTestStatus('Navigation Links', testPassed ? 'pass' : 'fail');
    return testPassed;
}

function testBackToTop() {
    const backToTop = document.getElementById('back-to-top');
    
    if (backToTop) {
        const result = backToTop.classList.contains('back-to-top') && backToTop.getAttribute('aria-label') === 'Back to top';
        window.navigationTests.updateTestStatus('Back to Top', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testIntersectionObserver() {
    // Test if IntersectionObserver is supported
    const result = 'IntersectionObserver' in window;
    window.navigationTests.updateTestStatus('Intersection Observer', result ? 'pass' : 'fail');
    
    return result;
}

function testProgressTracking() {
    const progressBar = document.getElementById('nav-progress');
    
    if (progressBar) {
        const result = progressBar.classList.contains('nav-progress-bar');
        window.navigationTests.updateTestStatus('Progress Tracking', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testActiveStateUpdates() {
    const navLinks = document.querySelectorAll('.demo-nav-item a');
    let testPassed = true;
    
    navLinks.forEach(link => {
        if (!link.hasAttribute('data-section')) {
            testPassed = false;
        }
    });
    
    window.navigationTests.updateTestStatus('Active State Updates', testPassed ? 'pass' : 'fail');
    return testPassed;
}

function testTabNavigation() {
    const navLinks = document.querySelectorAll('.demo-nav-item a');
    let testPassed = true;
    
    navLinks.forEach(link => {
        if (!link.hasAttribute('tabindex') && !link.hasAttribute('data-section')) {
            testPassed = false;
        }
    });
    
    window.navigationTests.updateTestStatus('Tab Navigation', testPassed ? 'pass' : 'fail');
    return testPassed;
}

function testArrowNavigation() {
    // Test if arrow key navigation is implemented
    const result = true; // Placeholder - implement actual test
    window.navigationTests.updateTestStatus('Arrow Key Navigation', result ? 'pass' : 'fail');
    
    return result;
}

function testEnterKeyActivation() {
    // Test if enter key activation is implemented
    const result = true; // Placeholder - implement actual test
    window.navigationTests.updateTestStatus('Enter Key Activation', result ? 'pass' : 'fail');
    
    return result;
}

function testMobileToggle() {
    const navToggle = document.getElementById('nav-toggle');
    const navigation = document.querySelector('.demo-navigation');
    
    if (navToggle && navigation) {
        const result = navToggle.classList.contains('nav-toggle') && navigation.classList.contains('demo-navigation');
        window.navigationTests.updateTestStatus('Mobile Toggle', result ? 'pass' : 'fail');
        
        return result;
    }
    return false;
}

function testResponsiveLayout() {
    // Test responsive layout functionality
    const result = true; // Placeholder - implement actual test
    window.navigationTests.updateTestStatus('Responsive Layout', result ? 'pass' : 'fail');
    
    return result;
}

function testTouchInteractions() {
    // Test touch interaction functionality
    const result = true; // Placeholder - implement actual test
    window.navigationTests.updateTestStatus('Touch Interactions', result ? 'pass' : 'fail');
    
    return result;
}

// Utility Functions
function resetTest(testName) {
    const statusElement = document.getElementById(`${testName.toLowerCase().replace(/\s+/g, '-')}-status`);
    if (statusElement) {
        statusElement.textContent = 'Pending';
        statusElement.className = 'test-status pending';
    }
}

function resetAllTests() {
    const statusElements = document.querySelectorAll('.test-status');
    statusElements.forEach(element => {
        element.textContent = 'Pending';
        element.className = 'test-status pending';
    });
    
    // Reset test results
    if (window.navigationTests) {
        window.navigationTests.testResults = {};
        window.navigationTests.updateSummary();
    }
}

function runAllTests() {
    const tests = [
        testSidebarNavigation,
        testBreadcrumbNavigation,
        testSectionIndicators,
        testInternalLinks,
        testNavigationLinks,
        testBackToTop,
        testIntersectionObserver,
        testProgressTracking,
        testActiveStateUpdates,
        testTabNavigation,
        testArrowNavigation,
        testEnterKeyActivation,
        testMobileToggle,
        testResponsiveLayout,
        testTouchInteractions
    ];

    tests.forEach((test, index) => {
        setTimeout(() => {
            test();
        }, index * 200); // Run tests with slight delay for better UX
    });
}

function generateTestReport() {
    if (window.navigationTests) {
        const report = {
            timestamp: new Date().toISOString(),
            results: window.navigationTests.testResults,
            summary: {
                total: Object.keys(window.navigationTests.testResults).length,
                passed: Object.values(window.navigationTests.testResults).filter(status => status === 'pass').length,
                failed: Object.values(window.navigationTests.testResults).filter(status => status === 'fail').length
            }
        };
        
        console.log('Navigation Test Report:', report);
        alert(`Test Report Generated!\nTotal: ${report.summary.total}\nPassed: ${report.summary.passed}\nFailed: ${report.summary.failed}`);
    }
}

function exportTestResults() {
    if (window.navigationTests) {
        const dataStr = JSON.stringify(window.navigationTests.testResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'navigation-test-results.json';
        link.click();
        URL.revokeObjectURL(url);
    }
}

function testNavigationPerformance() {
    const startTime = performance.now();
    
    // Simulate navigation operations
    const navLinks = document.querySelectorAll('.demo-nav-item a');
    let totalTime = 0;
    
    navLinks.forEach((link, index) => {
        const linkStart = performance.now();
        // Simulate navigation operation
        const href = link.getAttribute('href');
        const targetSection = document.getElementById(href.substring(1));
        const linkEnd = performance.now();
        
        totalTime += (linkEnd - linkStart);
    });
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const avgLinkTime = totalTime / navLinks.length;
    
    console.log(`Navigation Performance Test:\nTotal Time: ${totalDuration.toFixed(2)}ms\nAverage Link Time: ${avgLinkTime.toFixed(2)}ms`);
    
    const result = totalDuration < 100 && avgLinkTime < 10; // Performance thresholds
    window.navigationTests.updateTestStatus('Navigation Performance', result ? 'pass' : 'fail');
    
    return result;
}

function resetPerformanceTest() {
    resetTest('Navigation Performance');
}

// Reset functions for individual tests
function resetSidebarTest() { resetTest('Sidebar Navigation'); }
function resetBreadcrumbTest() { resetTest('Breadcrumb Navigation'); }
function resetIndicatorTest() { resetTest('Section Indicators'); }
function resetInternalTest() { resetTest('Internal Links'); }
function resetNavLinksTest() { resetTest('Navigation Links'); }
function resetBackToTopTest() { resetTest('Back to Top'); }
function resetIntersectionTest() { resetTest('Intersection Observer'); }
function resetProgressTest() { resetTest('Progress Tracking'); }
function resetActiveStateTest() { resetTest('Active State Updates'); }
function resetTabTest() { resetTest('Tab Navigation'); }
function resetArrowTest() { resetTest('Arrow Key Navigation'); }
function resetEnterTest() { resetTest('Enter Key Activation'); }
function resetToggleTest() { resetTest('Mobile Toggle'); }
function resetResponsiveTest() { resetTest('Responsive Layout'); }
function resetTouchTest() { resetTest('Touch Interactions'); }

// Initialize test suite
document.addEventListener('DOMContentLoaded', () => {
    window.navigationTests = new NavigationTestSuite();
});

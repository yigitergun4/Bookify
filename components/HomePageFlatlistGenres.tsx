import React, { useRef, useState } from 'react';
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const genres = [
    { id: '1', icon: 'book-outline', label: 'Fantasy' },
    { id: '2', icon: 'bookmark-outline', label: 'Text' },
    { id: '3', icon: 'pricetag-outline', label: 'Science' },
    { id: '4', icon: 'heart-outline', label: 'Romance' },
    { id: '5', icon: 'camera-outline', label: 'Historical' },
    { id: '6', icon: 'musical-notes-outline', label: 'Music' },
    { id: '7', icon: 'planet-outline', label: 'Sci-fi' },
];

export default function GenresScroller() {
    const flatListRef = useRef<FlatList>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const ITEM_WIDTH = 72;
    const VISIBLE_ITEMS = 4;
    const SCROLL_AMOUNT = ITEM_WIDTH * VISIBLE_ITEMS;

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        const scrollX = contentOffset.x;
        const visibleWidth = layoutMeasurement.width;
        const totalWidth = contentSize.width;

        setCanScrollLeft(scrollX > 0);
        setCanScrollRight(scrollX + visibleWidth < totalWidth - 1);
    };

    const scrollLeft = () => {
        flatListRef.current?.scrollToOffset({
            offset: Math.max(0, (flatListRef.current as any)?._listRef?._scrollMetrics?.offset - SCROLL_AMOUNT || 0),
            animated: true,
        });
    };

    const scrollRight = () => {
        flatListRef.current?.scrollToOffset({
            offset: ((flatListRef.current as any)?._listRef?._scrollMetrics?.offset || 0) + SCROLL_AMOUNT,
            animated: true,
        });
    };

    return (
        <View style={styles.wrapper}>
            {canScrollLeft && (
                <TouchableOpacity style={styles.arrowButton} onPress={scrollLeft}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
            )}

            <FlatList
                ref={flatListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={genres}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contentContainer}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.genreItem}>
                        <Ionicons name={item.icon} size={24} color="#000" />
                        <Text style={styles.genreLabel}>{item.label}</Text>
                    </TouchableOpacity>
                )}
            />

            {canScrollRight && (
                <TouchableOpacity style={styles.arrowButton} onPress={scrollRight}>
                    <Ionicons name="chevron-forward" size={24} color="#000" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    contentContainer: {
        paddingHorizontal: 8,
    },
    genreItem: {
        backgroundColor: '#dcdcdc',
        width: 70,
        height: 70,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    genreLabel: {
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
});
